import fs from "fs";
import Listing from "../models/Listing.js";
import Availability from "../models/availabilityModel.js";
import LessonCalender from "../models/LessonCalender.js";
import cloudinary from "../config/cloudinary.js";
import { geocodeAddress } from "../utils/geocodeAddress.js";
import { getPlaceDetails } from "../utils/getPlaceDetails.js";
import { slugify } from "../utils/utils.js";
import { escapeRegex, sanitizeRichHtml } from "../utils/sanitize.js";
import {
  SUPPORTED_CURRENCIES,
  convertCurrency,
  requireCurrency,
  requirePositivePrice,
} from "../services/currencyService.js";
import { requireTeacherPayoutCurrency } from "../services/stripeService.js";
import {
  addLessonToLessonCalender,
  createLessonCalender,
  removeLessonFromLessonCalender,
  updateLessonCalender,
  updateLessonInLessonCalender,
} from "./lessonCalenderController.js";
import {
  addLessonToAvailability,
  removeLessonFromAvailability,
  updateLessonInAvailability,
} from "./availabilityController.js";

const parseBoolean = (value) => value === true || value === "true";

const parseJsonField = (value) => {
  if (!value || typeof value !== "string") return value || null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const isOnDemandPrice = (pricingType) => pricingType === "fixed_on_demand";

const hasValidTimeSlot = (slots) =>
  Array.isArray(slots) &&
  slots.some(
    (slot) =>
      slot &&
      typeof slot.start === "string" &&
      typeof slot.end === "string" &&
      slot.start.trim() !== "" &&
      slot.end.trim() !== "" &&
      slot.start.trim() !== slot.end.trim()
  );

export const hasAnyCalendarTimeSlot = (weeklyHours, dateSpecificHours) => {
  const parsedWeekly = parseJsonField(weeklyHours);
  const parsedDates = parseJsonField(dateSpecificHours);

  const weeklyList = Array.isArray(parsedWeekly)
    ? parsedWeekly
    : parsedWeekly && typeof parsedWeekly === "object"
    ? Object.values(parsedWeekly)
    : [];

  if (
    weeklyList.some(
      (day) =>
        day &&
        day.available !== false &&
        day.unavailable !== true &&
        hasValidTimeSlot(day.slots)
    )
  ) {
    return true;
  }

  const dateList = Array.isArray(parsedDates) ? parsedDates : [];
  return dateList.some(
    (entry) =>
      entry &&
      entry.available !== false &&
      entry.unavailable !== true &&
      hasValidTimeSlot(entry.slots)
  );
};

export const ensureCalendarHasTimeSlots = async ({
  userId,
  calendarFlag,
  calenderId,
  weeklyHours,
  dateSpecificHours,
  allowPayloadOverride = false,
}) => {
  if (calendarFlag) {
    const availability = await Availability.findOne({ user: userId }).lean();
    const hasDefaultSlots = hasAnyCalendarTimeSlot(
      availability?.weeklyHours,
      availability?.dateSpecificHours
    );
    if (!hasDefaultSlots) {
      return {
        ok: false,
        message:
          "Your default availability has no time slots. Please add at least one time slot in your calendar before creating a calendar-based listing.",
      };
    }
    return { ok: true };
  }

  if (calenderId) {
    const existingCalendar = await LessonCalender.findOne({
      _id: calenderId,
      user: userId,
    }).lean();
    if (!existingCalendar) {
      return {
        ok: false,
        message:
          "Selected availability calendar was not found. Please select a valid calendar with at least one time slot.",
      };
    }

    const payloadProvided =
      allowPayloadOverride &&
      (weeklyHours !== undefined || dateSpecificHours !== undefined);
    const hasSlots = payloadProvided
      ? hasAnyCalendarTimeSlot(weeklyHours, dateSpecificHours)
      : hasAnyCalendarTimeSlot(
          existingCalendar.weeklyHours,
          existingCalendar.dateSpecificHours
        );

    if (!hasSlots) {
      return {
        ok: false,
        message:
          "The selected calendar has no available time slots. Please add at least one time slot before saving this listing.",
      };
    }
    return { ok: true };
  }

  if (!hasAnyCalendarTimeSlot(weeklyHours, dateSpecificHours)) {
    return {
      ok: false,
      message:
        "Please add at least one available time slot in your calendar before creating a calendar-based listing.",
    };
  }

  return { ok: true };
};

const cleanupFiles = (files = []) => {
  files.forEach((file) => {
    if (file?.path) {
      fs.promises.unlink(file.path).catch(() => {});
    }
  });
};

const generateUniqueListingSlug = async (title, excludeId = null) => {
  const baseSlug = slugify(title) || "listing";
  let slug = baseSlug;
  let suffix = 1;

  while (
    await Listing.exists({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
};

const ensureListingSlug = async (listing) => {
  if (!listing || listing.slug) return listing;
  listing.slug = await generateUniqueListingSlug(listing.title, listing._id);
  await listing.save();
  return listing;
};

export const createListing = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      duration,
      price,
      pricingType = "hourly_calendar",
      allowMessageWithoutPayment,
      isOnline,
      supportsInPerson,
      location,
      placeId,
      status,
      usecapacity,
      discount,
      message,
      isGroupAvailable,
      calender,
      calenderId,
      weeklyHours,
      dateSpecificHours,
      timeZone,
      calendarName,
      inputCurrency = "USD",
    } = req.body;

    const requiresDuration = pricingType === "hourly_calendar" || pricingType === "hourly";

    if (!title || !category || !description || (requiresDuration && !duration) || price === undefined || price === "") {
      cleanupFiles(req.files);
      return res.status(400).json({
        status: false,
        message: requiresDuration
          ? "Title, category, description, duration, and price are required"
          : "Title, category, description, and price are required",
      });
    }

    const coverImageFiles = (req.files || []).filter((file) => file.fieldname === "coverImage");
    const listingImageFiles = (req.files || []).filter((file) => file.fieldname === "images");
    const legacyImageFiles = !coverImageFiles.length && listingImageFiles.length >= 3
      ? listingImageFiles
      : null;

    if (!legacyImageFiles && (!coverImageFiles.length || listingImageFiles.length < 2)) {
      cleanupFiles(req.files);
      return res.status(400).json({
        status: false,
        message: "Minimum 3 images are required (1 cover + at least 2 listing images)",
      });
    }

    const listingCurrency = requireCurrency(inputCurrency || "USD");
    const canonicalPrice = isOnDemandPrice(pricingType)
      ? 0
      : requirePositivePrice(price, listingCurrency);

    const isOnlineFlag = parseBoolean(isOnline);
    const supportsInPersonFlag = parseBoolean(supportsInPerson);
    const isGroupAvailableFlag = parseBoolean(isGroupAvailable);
    const usesAvailabilityCalendar = pricingType === "hourly_calendar";
    const calendarFlag = parseBoolean(calender);
    let resolvedCalenderId = usesAvailabilityCalendar ? calenderId || null : null;

    if (supportsInPersonFlag && !location && !placeId) {
      cleanupFiles(req.files);
      return res.status(400).json({
        status: false,
        message: "Location is required for in-person listings",
      });
    }

    if (usesAvailabilityCalendar) {
      const calendarValidation = await ensureCalendarHasTimeSlots({
        userId: req.user._id,
        calendarFlag,
        calenderId: resolvedCalenderId,
        weeklyHours,
        dateSpecificHours,
      });
      if (!calendarValidation.ok) {
        cleanupFiles(req.files);
        return res.status(400).json({
          status: false,
          message: calendarValidation.message,
        });
      }
    }

    const uploadListingImage = async (file) => {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "listings",
      });
      fs.promises.unlink(file.path).catch(() => {});
      return {
        url: result.secure_url,
        public_id: result.public_id,
      };
    };

    const coverImage = legacyImageFiles
      ? await uploadListingImage(legacyImageFiles[0])
      : await uploadListingImage(coverImageFiles[0]);
    const listingImages = await Promise.all(
      (legacyImageFiles ? legacyImageFiles.slice(1) : listingImageFiles).map(uploadListingImage)
    );

    let lat = null;
    let lng = null;
    let address = location || "";
    let resolvedPlaceId = placeId || null;

    if (supportsInPersonFlag && (location || placeId)) {
      const place = placeId ? await getPlaceDetails(placeId) : { lat: null, lng: null, address: null };
      const geo = !place.lat && location ? await geocodeAddress(location) : {};
      lat = place.lat ?? geo.lat ?? null;
      lng = place.lng ?? geo.lng ?? null;
      address = place.address || location || "";
    }

    const allowedSellerStatuses = ["Active", "Inactive", "Draft"];
    const resolvedCreateStatus =
      req.user?.role === "admin"
        ? status || "Active"
        : allowedSellerStatuses.includes(status)
        ? status
        : "Active";

    const listing = await Listing.create({
      title,
      slug: await generateUniqueListingSlug(title),
      category,
      description: sanitizeRichHtml(description),
      message,
      duration,
      price: canonicalPrice,
      currency: listingCurrency,
      pricingType,
      allowMessageWithoutPayment: parseBoolean(allowMessageWithoutPayment),
      isOnline: isOnlineFlag,
      supportsInPerson: supportsInPersonFlag,
      location: supportsInPersonFlag && location ? location : "",
      address: supportsInPersonFlag && address ? address : "",
      placeId: supportsInPersonFlag ? resolvedPlaceId : null,
      lat,
      lng,
      status: resolvedCreateStatus,
      usecapacity: usecapacity ?? 0,
      discount: discount ?? 0,
      isGroupAvailable: isGroupAvailableFlag,
      coverImage,
      images: listingImages,
      createdBy: req.user._id,
      calender: usesAvailabilityCalendar ? calendarFlag : false,
      calenderId: resolvedCalenderId,
      weeklyHours: null,
      dateSpecificHours: null,
      timeZone: null,
      calendarName: calendarName || null,
      ...(supportsInPersonFlag && lng && lat
        ? {
            geoLocation: {
              type: "Point",
              coordinates: [lng, lat],
            },
          }
        : {}),
    });

    if (usesAvailabilityCalendar && calendarFlag) {
      await addLessonToAvailability(req.user._id, listing._id, isGroupAvailableFlag, weeklyHours, dateSpecificHours);
    } else if (usesAvailabilityCalendar) {
      if (!resolvedCalenderId) {
        const calenderResult = await createLessonCalender({
          weeklyHours,
          dateSpecificHours,
          timeZone,
          userId: req.user._id,
          type: "listing",
          lessonId: listing._id,
          calendarName: calendarName || "Listing Calendar",
        });

        if (calenderResult?.calenderId) {
          resolvedCalenderId = calenderResult.calenderId;
          listing.calenderId = resolvedCalenderId;
          await listing.save();
        }
      }

      if (resolvedCalenderId) {
        await addLessonToLessonCalender(req.user._id, listing._id, isGroupAvailableFlag, resolvedCalenderId, weeklyHours, dateSpecificHours);
      }
    }

    res.status(201).json({
      status: true,
      message: "Listing created successfully",
      listing,
    });
  } catch (error) {
    cleanupFiles(req.files);
    console.error("Create listing error:", error);
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const getMyListings = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = { createdBy: req.user._id };
    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email image averageRating totalRatings"),
      Listing.countDocuments(query),
    ]);
    const listingsWithSlugs = await Promise.all(listings.map(ensureListingSlug));

    res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      listings: listingsWithSlugs,
    });
  } catch (error) {
    console.error("Get my listings error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getActiveListings = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const {
      search = "",
      minPrice,
      maxPrice,
      isOnline,
      supportsInPerson,
      location,
      category,
      createdBy,
      currency = "USD",
      pricingType,
      sort = "best_match",
    } = req.query;

    const query = { status: "Active" };
    const andFilters = [];

    if (pricingType && typeof pricingType === "string") {
      if (pricingType === "fixed_on_demand") {
        query.pricingType = "fixed_on_demand";
      } else if (pricingType === "fixed" || pricingType === "fixed_pricing") {
        query.pricingType = { $ne: "fixed_on_demand" };
      } else if (["hourly_calendar", "hourly"].includes(pricingType)) {
        query.pricingType = pricingType;
      }
    }

    if (typeof createdBy === "string" && createdBy.trim()) {
      query.createdBy = createdBy.trim();
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice !== "" && maxPrice !== "") {
      const filterCurrency = requireCurrency(currency);
      const priceRanges = await Promise.all(
        SUPPORTED_CURRENCIES.map(async (listingCurrency) => {
          const min = await convertCurrency(minPrice, filterCurrency, listingCurrency);
          const max = await convertCurrency(maxPrice, filterCurrency, listingCurrency);
          return {
            currency: listingCurrency,
            price: { $gte: min.amount, $lte: max.amount },
          };
        })
      );

      andFilters.push({
        $or: [
          ...priceRanges,
          {
            currency: { $exists: false },
            price: {
              $gte: (await convertCurrency(minPrice, filterCurrency, "USD")).amount,
              $lte: (await convertCurrency(maxPrice, filterCurrency, "USD")).amount,
            },
          },
        ],
      });
    }

    const safeSearch = typeof search === "string" ? escapeRegex(search) : "";
    if (safeSearch) {
      andFilters.push({
        $or: [
          { title: { $regex: safeSearch, $options: "i" } },
          { category: { $regex: safeSearch, $options: "i" } },
          { description: { $regex: safeSearch, $options: "i" } },
        ],
      });
    }

    if (typeof isOnline !== "undefined") {
      query.isOnline = isOnline === "true";
    }

    if (supportsInPerson === "true") {
      query.supportsInPerson = true;
    }

    if (category) {
      if (Array.isArray(category)) {
        const cleanCats = category.map((c) => escapeRegex(c)).filter(Boolean);
        if (cleanCats.length > 1) {
          query.category = { $in: cleanCats.map((c) => new RegExp(`^${c}$`, "i")) };
        } else if (cleanCats.length === 1) {
          query.category = { $regex: cleanCats[0], $options: "i" };
        }
      } else if (typeof category === "string" && category.trim()) {
        const cats = category.split(",").map((c) => escapeRegex(c)).filter(Boolean);
        if (cats.length > 1) {
          query.category = { $in: cats.map((c) => new RegExp(`^${c}$`, "i")) };
        } else if (cats.length === 1) {
          query.category = { $regex: cats[0], $options: "i" };
        }
      }
    }

    const safeLocation = typeof location === "string" ? escapeRegex(location) : "";
    if (safeLocation) {
      andFilters.push({
        $or: [
          { location: { $regex: safeLocation, $options: "i" } },
          { address: { $regex: safeLocation, $options: "i" } },
        ],
      });
    }

    if (andFilters.length) query.$and = andFilters;

    let sortQuery = { createdAt: -1 };
    if (sort === "newest") {
      sortQuery = { createdAt: -1 };
    } else if (sort === "best_match") {
      sortQuery = { createdAt: -1 };
    }

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name image averageRating totalRatings"),
      Listing.countDocuments(query),
    ]);
    const listingsWithSlugs = await Promise.all(listings.map(ensureListingSlug));

    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      listings: listingsWithSlugs,
    });
  } catch (error) {
    console.error("Get active listings error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

// New: admin / all listings endpoint
export const getAllListings = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ status: false, message: "Admin access required" });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { search = "", category, createdBy, status } = req.query;

    const query = {};

    if (typeof status === "string" && status.trim()) {
      query.status = status.trim();
    }

    if (typeof createdBy === "string" && createdBy.trim()) {
      query.createdBy = createdBy.trim();
    }

    const safeSearch = typeof search === "string" ? escapeRegex(search) : "";
    if (safeSearch) {
      query.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const safeCategory = typeof category === "string" ? escapeRegex(category) : "";
    if (safeCategory) {
      query.category = { $regex: safeCategory, $options: "i" };
    }

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email image averageRating totalRatings"),
      Listing.countDocuments(query),
    ]);

    const listingsWithSlugs = await Promise.all(listings.map(ensureListingSlug));

    res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      listings: listingsWithSlugs,
    });
  } catch (error) {
    console.error("Get all listings error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      "createdBy",
      "name image averageRating totalRatings"
    );

    if (!listing) {
      return res.status(404).json({ status: false, message: "Listing not found" });
    }

    const ownerId = String(listing.createdBy?._id || listing.createdBy || "");
    const requesterId = String(req.user?._id || "");
    const isOwner = Boolean(requesterId && ownerId && requesterId === ownerId);
    const isAdmin = req.user?.role === "admin";
    if (listing.status !== "Active" && !isOwner && !isAdmin) {
      return res.status(404).json({ status: false, message: "Listing not found" });
    }

    await ensureListingSlug(listing);

    res.json({ status: true, listing });
  } catch (error) {
    console.error("Get listing by id error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getListingBySlug = async (req, res) => {
  try {
    const listing = await Listing.findOne({
      slug: req.params.slug,
      status: "Active",
    }).populate("createdBy", "name image averageRating totalRatings bio classHosted classesHosted classesAttended hideLesson");

    if (!listing) {
      return res.status(404).json({ status: false, message: "Listing not found" });
    }

    res.json({ status: true, listing });
  } catch (error) {
    console.error("Get listing by slug error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateListing = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      duration,
      price,
      pricingType,
      allowMessageWithoutPayment,
      isOnline,
      supportsInPerson,
      location,
      placeId,
      status,
      usecapacity,
      discount,
      message,
      isGroupAvailable,
      calender,
      calenderId,
      weeklyHours,
      dateSpecificHours,
      timeZone,
      calendarName,
      existingImages,
      existingCoverImageId,
      inputCurrency,
    } = req.body;

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      cleanupFiles(req.files);
      return res.status(404).json({ status: false, message: "Listing not found" });
    }

    // Allow owner or admin to update
    if (listing.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      cleanupFiles(req.files);
      return res.status(403).json({ status: false, message: "Not authorized to update this listing" });
    }

    const nextPricingType = pricingType !== undefined ? pricingType : listing.pricingType;
    const isSwitchingToCalendar =
      nextPricingType === "hourly_calendar" && listing.pricingType !== "hourly_calendar";
    if (nextPricingType === "hourly_calendar" && (calender !== undefined || isSwitchingToCalendar)) {
      const nextCalendarFlag =
        calender !== undefined ? parseBoolean(calender) : Boolean(listing.calender);
      const nextCalenderId = nextCalendarFlag
        ? null
        : calenderId || listing.calenderId || null;
      const calendarValidation = await ensureCalendarHasTimeSlots({
        userId: listing.createdBy,
        calendarFlag: nextCalendarFlag,
        calenderId: nextCalenderId,
        weeklyHours,
        dateSpecificHours,
        allowPayloadOverride: true,
      });
      if (!calendarValidation.ok) {
        cleanupFiles(req.files);
        return res.status(400).json({
          status: false,
          message: calendarValidation.message,
        });
      }
    }

    let coverImageFile = null;
    const listingImageFiles = [];

    (req.files || []).forEach((file) => {
      if (file.fieldname === "coverImage") {
        coverImageFile = file;
      } else if (file.fieldname === "images") {
        listingImageFiles.push(file);
      }
    });

    if (coverImageFile) {
      const result = await cloudinary.uploader.upload(coverImageFile.path, {
        folder: "listings",
      });
      fs.promises.unlink(coverImageFile.path).catch(() => {});

      if (listing.coverImage?.public_id) {
        await cloudinary.uploader.destroy(listing.coverImage.public_id);
      }

      listing.coverImage = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    } else if (existingCoverImageId && listing.coverImage?.public_id !== existingCoverImageId) {
      return res.status(400).json({ status: false, message: "Invalid existing cover image" });
    }

    let uploadedImagePublicIds = [];
    if (listingImageFiles.length > 0) {
      const uploadedImages = [];
      for (const file of listingImageFiles) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "listings",
        });
        fs.promises.unlink(file.path).catch(() => {});
        uploadedImages.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
        uploadedImagePublicIds.push(result.public_id);
      }
      listing.images = [...(listing.images || []), ...uploadedImages];
    }

    let existingImagesList = [];
    if (existingImages) {
      try {
        existingImagesList = Array.isArray(existingImages)
          ? existingImages
          : JSON.parse(existingImages);
      } catch {
        existingImagesList = Array.isArray(existingImages) ? existingImages : [existingImages];
      }
    }

    const imagesToKeep = [...existingImagesList, ...uploadedImagePublicIds];
    if (imagesToKeep.length > 0) {
      const finalImages = imagesToKeep
        .map((publicId) => (listing.images || []).find((img) => img.public_id === publicId))
        .filter(Boolean);

      const imagesToDelete = (listing.images || []).filter(
        (img) => !imagesToKeep.includes(img.public_id)
      );
      for (const img of imagesToDelete) {
        if (img.public_id) await cloudinary.uploader.destroy(img.public_id);
      }

      listing.images = finalImages;
    }

    if (title !== undefined) {
      listing.title = title;
      listing.slug = await generateUniqueListingSlug(title, listing._id);
    }
    if (category !== undefined) listing.category = category;
    if (description !== undefined) listing.description = sanitizeRichHtml(description);
    if (duration !== undefined) listing.duration = duration;
    if (message !== undefined) listing.message = message;
    if (price !== undefined && price !== "") {
      const listingCurrency = requireCurrency(inputCurrency || listing.currency);
      listing.price = isOnDemandPrice(pricingType || listing.pricingType)
        ? 0
        : requirePositivePrice(price, listingCurrency);
      listing.currency = listingCurrency;
    }
    if (pricingType !== undefined) listing.pricingType = pricingType;
    if (allowMessageWithoutPayment !== undefined) {
      listing.allowMessageWithoutPayment = parseBoolean(allowMessageWithoutPayment);
    }
    if (isOnline !== undefined) listing.isOnline = parseBoolean(isOnline);
    if (status !== undefined) {
      const isModerated = ["Suspended", "Rejected"].includes(listing.status);
      if (req.user?.role === "admin") {
        listing.status = status;
      } else if (isModerated && status !== listing.status) {
        cleanupFiles(req.files);
        return res.status(403).json({
          status: false,
          message: "Moderated listings cannot be reactivated by the seller",
        });
      } else if (["Active", "Inactive", "Draft"].includes(status)) {
        listing.status = status;
      }
    }
    if (usecapacity !== undefined) listing.usecapacity = usecapacity;
    if (discount !== undefined) listing.discount = discount;
    if (isGroupAvailable !== undefined) {
      listing.isGroupAvailable = parseBoolean(isGroupAvailable);
    }

    const supportsInPersonProvided = supportsInPerson !== undefined;
    const supportsInPersonFlag = supportsInPersonProvided
      ? parseBoolean(supportsInPerson)
      : listing.supportsInPerson;

    listing.supportsInPerson = supportsInPersonFlag;
    if (supportsInPersonFlag) {
      if (location !== undefined || placeId !== undefined) {
        const nextLocation = location ?? listing.location ?? "";
        const nextPlaceId = placeId || listing.placeId || null;
        const place = nextPlaceId
          ? await getPlaceDetails(nextPlaceId)
          : { lat: null, lng: null, address: null };
        const geo = !place.lat && nextLocation ? await geocodeAddress(nextLocation) : {};

        listing.location = nextLocation;
        listing.address = place.address || nextLocation || listing.address || "";
        listing.placeId = nextPlaceId;
        listing.lat = place.lat ?? geo.lat ?? listing.lat ?? null;
        listing.lng = place.lng ?? geo.lng ?? listing.lng ?? null;

        if (listing.lng && listing.lat) {
          listing.geoLocation = {
            type: "Point",
            coordinates: [listing.lng, listing.lat],
          };
        }
      }
    } else {
      listing.location = "";
      listing.address = "";
      listing.placeId = null;
      listing.lat = null;
      listing.lng = null;
      listing.geoLocation = undefined;
    }

    if (calender !== undefined || listing.pricingType !== "hourly_calendar") {
      const calendarFlag = parseBoolean(calender);
      const weeklyOverride = parseJsonField(weeklyHours);
      const dateOverride = parseJsonField(dateSpecificHours);

      if (listing.pricingType !== "hourly_calendar") {
        await removeLessonFromAvailability(listing.createdBy, listing._id);
        if (listing.calenderId) {
          await removeLessonFromLessonCalender(listing.createdBy, listing._id, listing.calenderId.toString());
        }
        listing.calender = false;
        listing.calenderId = null;
      } else if (calendarFlag) {
        if (listing.calenderId) {
          await removeLessonFromLessonCalender(listing.createdBy, listing._id, listing.calenderId.toString());
        }

        await updateLessonInAvailability(listing.createdBy, listing._id, listing.isGroupAvailable, weeklyOverride, dateOverride);
        listing.calender = true;
        listing.calenderId = null;
      } else {
        let resolvedCalenderId = calenderId || listing.calenderId || null;

        if (!resolvedCalenderId || weeklyHours || dateSpecificHours || timeZone) {
          const updateResult = await updateLessonCalender({
            calenderId: resolvedCalenderId,
            lessonId: listing._id,
            weeklyHours,
            dateSpecificHours,
            timeZone,
            calendarName,
          });

          if (!updateResult.updated && updateResult.reason === "not_found") {
            const createResult = await createLessonCalender({
              weeklyHours,
              dateSpecificHours,
              timeZone,
              userId: listing.createdBy,
              type: "listing",
              lessonId: listing._id,
              calendarName: calendarName || "Listing Calendar",
            });
            if (createResult?.calenderId) {
              resolvedCalenderId = createResult.calenderId;
            }
          } else if (updateResult?.calenderId) {
            resolvedCalenderId = updateResult.calenderId;
          }
        }

        if (resolvedCalenderId) {
          const oldCalenderId = listing.calenderId?.toString();
          if (oldCalenderId && oldCalenderId !== resolvedCalenderId.toString()) {
            await removeLessonFromLessonCalender(listing.createdBy, listing._id, oldCalenderId);
          }

          listing.calender = false;
          listing.calenderId = resolvedCalenderId;
          await addLessonToLessonCalender(listing.createdBy, listing._id, listing.isGroupAvailable, resolvedCalenderId, weeklyOverride, dateOverride);
          await updateLessonInLessonCalender(listing.createdBy, listing._id, listing.isGroupAvailable, resolvedCalenderId, weeklyOverride, dateOverride);
        }
      }

      listing.weeklyHours = null;
      listing.dateSpecificHours = null;
      listing.timeZone = null;
      listing.calendarName = calendarName || listing.calendarName || null;
    }

    await listing.save();

    res.json({
      status: true,
      message: "Listing updated successfully",
      listing,
    });
  } catch (error) {
    cleanupFiles(req.files);
    console.error("Update listing error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ status: false, message: "Listing not found" });
    }

    // Allow owner or admin to delete
    if (listing.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ status: false, message: "Not authorized to delete this listing" });
    }

    if (listing.coverImage?.public_id) {
      await cloudinary.uploader.destroy(listing.coverImage.public_id);
    }

    for (const image of listing.images || []) {
      if (image.public_id) {
        await cloudinary.uploader.destroy(image.public_id);
      }
    }

    await removeLessonFromAvailability(listing.createdBy, listing._id);
    if (listing.calenderId) {
      await removeLessonFromLessonCalender(listing.createdBy, listing._id, listing.calenderId);
    }

    await listing.deleteOne();

    res.json({ status: true, message: "Listing deleted successfully", listingId: req.params.id });
  } catch (error) {
    console.error("Delete listing error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};
