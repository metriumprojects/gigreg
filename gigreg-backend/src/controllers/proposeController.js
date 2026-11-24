import Propose from "../models/Propose.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { getPlaceDetails } from "../utils/getPlaceDetails.js";
import { geocodeAddress } from "../utils/geocodeAddress.js";
import { escapeRegex } from "../utils/sanitize.js";

const ALLOWED_PROPOSE_STATUSES = new Set(["Active", "Draft", "Inactive", "Closed"]);

const safeCleanupFiles = (files = []) => {
  if (!Array.isArray(files)) return;
  for (const file of files) {
    if (file?.path) {
      fs.promises.unlink(file.path).catch(() => {});
    }
  }
};

const parseBoolean = (value) => value === true || value === "true";

const parseSafeProposePrice = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 1_000_000) {
    return null;
  }
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const validateActiveProposeFields = ({
  title,
  description,
  category,
  price,
  supportsInPerson,
  location,
  requireDescription = true,
}) => {
  if (!String(title || "").trim()) {
    return { ok: false, message: "Title is required" };
  }
  if (requireDescription && !String(description || "").trim()) {
    return { ok: false, message: "Description is required" };
  }
  if (!String(category || "").trim()) {
    return { ok: false, message: "Category is required" };
  }
  const numericPrice = Number(price);
  if (
    price === undefined ||
    price === null ||
    price === "" ||
    !Number.isFinite(numericPrice) ||
    numericPrice <= 0 ||
    numericPrice > 1_000_000
  ) {
    return { ok: false, message: "A valid budget greater than 0 is required" };
  }
  if (supportsInPerson && !String(location || "").trim()) {
    return { ok: false, message: "Location is required for in-person requests" };
  }
  return { ok: true };
};

/* ----------------------------- CREATE Propose ----------------------------- */
export const createPropose = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      price,
      location,
      placeId,
      isOnline,
      supportsInPerson,
      pricingType,
      status,
    } = req.body;

    const targetStatus =
      status === "Draft" ? "Draft" : "Active";
    const resolvedPricingType = pricingType === "hourly" ? "hourly" : "fixed";
    const isOnlineFlag = parseBoolean(isOnline);
    const supportsInPersonFlag = parseBoolean(supportsInPerson);

    const safePrice = parseSafeProposePrice(price);
    if (safePrice === null) {
      safeCleanupFiles(req.files);
      return res.status(400).json({ status: false, message: "Invalid proposal budget price" });
    }

    if (targetStatus === "Draft") {
      const hasAnyField = Boolean(
        String(title || "").trim() ||
          String(description || "").trim() ||
          String(category || "").trim() ||
          String(location || "").trim() ||
          safePrice !== undefined ||
          (req.files && req.files.length > 0)
      );
      if (!hasAnyField) {
        safeCleanupFiles(req.files);
        return res.status(400).json({
          status: false,
          message: "Please enter at least one detail to save a draft",
        });
      }
    } else {
      const validation = validateActiveProposeFields({
        title,
        description,
        category,
        price: safePrice,
        supportsInPerson: supportsInPersonFlag,
        location,
        requireDescription: false,
      });
      if (!validation.ok) {
        safeCleanupFiles(req.files);
        return res.status(400).json({ status: false, message: validation.message });
      }
    }

    // Upload images to Cloudinary (optional)
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, { folder: "Proposes" });
        uploadedImages.push({ url: result.secure_url, public_id: result.public_id });
        safeCleanupFiles([file]);
      }
    }

    let lat = null, lng = null, address = location || "", resolvedPlaceId = placeId || null;
    if (supportsInPersonFlag && (location || placeId)) {
      const place = placeId ? await getPlaceDetails(placeId) : { lat: null, lng: null, address: null };
      const geo = !place.lat && location ? await geocodeAddress(location) : {};
      lat = place.lat ?? geo.lat ?? null;
      lng = place.lng ?? geo.lng ?? null;
      address = place.address || location || "";
    }

    const propose = await Propose.create({
      title: typeof title === "string" ? title.trim() : "",
      category: typeof category === "string" ? category.trim() : "",
      description: typeof description === "string" ? description : "",
      price: safePrice,
      pricingType: resolvedPricingType,
      isOnline: isOnlineFlag,
      supportsInPerson: supportsInPersonFlag,
      location: location || "",
      address,
      placeId: resolvedPlaceId,
      lat,
      lng,
      images: uploadedImages,
      user: req.user._id,
      status: targetStatus,
    });

    res.status(201).json({
      status: true,
      message: targetStatus === "Draft" ? "Draft saved successfully" : "Propose created successfully",
      propose,
    });
  } catch (error) {
    safeCleanupFiles(req.files);
    console.error("Create Propose error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

/* ------------------------------ GET ALL PROPOSES ----------------------------- */

export const getAllProposes = async (req, res) => {
  try {
    let {
      page,
      limit,
      search,
      minPrice,
      maxPrice,
      isOnline,
      supportsInPerson,
      location,
      category,
      sort = "newest",
    } = req.query;

    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 20));

    // Validate and set default price range
    let minPrice_num = Number(minPrice);
    let maxPrice_num = Number(maxPrice);
    
    if (isNaN(minPrice_num)) minPrice_num = 0;
    if (isNaN(maxPrice_num)) maxPrice_num = 999999;

    const proposeFilter = {
      status: "Active",
      price: { $gte: minPrice_num, $lte: maxPrice_num },
    };

    // Handle search filtering
    const safeSearch = typeof search === "string" ? escapeRegex(search) : "";
    if (safeSearch) {
      proposeFilter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
      ];
    }

    // Handle category filtering
    if (category) {
      if (Array.isArray(category)) {
        const cleanCats = category.map((c) => String(c).trim()).filter(Boolean);
        if (cleanCats.length > 1) {
          proposeFilter.category = { $in: cleanCats };
        } else if (cleanCats.length === 1) {
          proposeFilter.category = cleanCats[0];
        }
      } else if (typeof category === "string" && category.trim()) {
        const cats = category.split(",").map((c) => c.trim()).filter(Boolean);
        if (cats.length > 1) {
          proposeFilter.category = { $in: cats };
        } else if (cats.length === 1) {
          proposeFilter.category = cats[0];
        }
      }
    }

    // Handle location type filtering
    const wantsInPerson = supportsInPerson === "true";
    const wantsOnline = isOnline === "true";

    if (wantsOnline && wantsInPerson) {
      // Both selected - show all requests (no filter needed)
      // Do nothing - will show all requests
    } else if (wantsInPerson && !wantsOnline) {
      // Only in-person selected - show in-person + mixed requests
      proposeFilter.supportsInPerson = true;
    } else if (wantsOnline && !wantsInPerson) {
      // Only online selected - show online + mixed requests
      proposeFilter.isOnline = true;
    } else {
      // Neither selected - default to showing all requests
      // Do nothing - will show all requests
    }

    // Handle location text filtering
    const safeLocation = typeof location === "string" ? escapeRegex(location) : "";
    if (safeLocation) {
      proposeFilter.location = { $regex: safeLocation, $options: "i" };
    }

    // ---------------------------
    // Independent Proposes Pagination
    // ---------------------------
    const total = await Propose.countDocuments(proposeFilter);

    const sortOrder = String(sort).toLowerCase() === "oldest" ? 1 : -1;

    const allProposes = await Propose.find(proposeFilter)
      .populate("user", "name image averageRating totalRatings")
      .sort({ createdAt: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

  
    // ---------------------------
    res.json({
      success: true,
     
      data: allProposes,
      total: total,
      totalPages: Math.ceil(total / limit),

      page,
      limit,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/* ------------------------------ GET All user Propose --------------------------- */
export const getProposeByUser = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const propose = await Propose.find({ user: userId })
      .populate("user", "name email image averageRating totalRatings")
      .sort({ updatedAt: -1 });
    res.json(propose);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/* ------------------------------ GET SINGLE Propose --------------------------- */
export const getProposeById = async (req, res) => {
  try {
    const propose = await Propose.findById(req.params.id).populate("user", "name image averageRating totalRatings");
    if (!propose || propose.status === "Draft") {
      return res.status(404).json({ status: false, message: "Propose not found" });
    }
    res.json(propose);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ----------------------------- UPDATE Propose ----------------------------- */
export const updatePropose = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      price,
      pricingType,
      location,
      placeId,
      isOnline,
      supportsInPerson,
      status,
      existingImages,
    } = req.body;
    const propose = await Propose.findById(req.params.id);

    if (!propose) {
      safeCleanupFiles(req.files);
      return res.status(404).json({ status: false, message: "Propose not found" });
    }

    if (String(propose.user) !== String(req.user?._id) && req.user?.role !== "admin") {
      safeCleanupFiles(req.files);
      return res.status(403).json({ status: false, message: "Not authorized to update this proposal" });
    }

    if (status !== undefined && status !== "") {
      if (!ALLOWED_PROPOSE_STATUSES.has(status) && req.user?.role !== "admin") {
        safeCleanupFiles(req.files);
        return res.status(400).json({ status: false, message: "Invalid proposal status" });
      }
    }

    const nextStatus = status !== undefined && status !== "" ? status : propose.status;
    let nextPrice = propose.price;
    if (price !== undefined) {
      if (price === "" || price === null) {
        if (nextStatus === "Draft") {
          nextPrice = undefined;
        } else {
          safeCleanupFiles(req.files);
          return res.status(400).json({ status: false, message: "A valid budget greater than 0 is required" });
        }
      } else {
        const safePrice = parseSafeProposePrice(price);
        if (safePrice === null) {
          safeCleanupFiles(req.files);
          return res.status(400).json({ status: false, message: "Invalid proposal budget price" });
        }
        nextPrice = safePrice;
      }
    }

    const nextTitle = title !== undefined ? String(title).trim() : propose.title;
    const nextCategory = category !== undefined ? String(category).trim() : propose.category;
    const nextDescription = description !== undefined ? String(description) : propose.description;
    const nextSupportsInPerson =
      supportsInPerson !== undefined ? parseBoolean(supportsInPerson) : propose.supportsInPerson;
    const nextIsOnline = isOnline !== undefined ? parseBoolean(isOnline) : propose.isOnline;
    const nextLocation = location !== undefined ? String(location) : propose.location;

    if (nextStatus === "Active") {
      const validation = validateActiveProposeFields({
        title: nextTitle,
        description: nextDescription,
        category: nextCategory,
        price: nextPrice,
        supportsInPerson: nextSupportsInPerson,
        location: nextLocation,
        requireDescription: true,
      });
      if (!validation.ok) {
        safeCleanupFiles(req.files);
        return res.status(400).json({ status: false, message: validation.message });
      }
    }

    // Resolve image retention / upload
    let retainedImages = null;
    if (existingImages !== undefined) {
      let parsedExisting = [];
      try {
        parsedExisting = Array.isArray(existingImages)
          ? existingImages
          : JSON.parse(existingImages || "[]");
      } catch {
        parsedExisting = [];
      }
      if (!Array.isArray(parsedExisting)) parsedExisting = [];

      const keepIds = new Set(
        parsedExisting
          .map((item) => (typeof item === "string" ? item : item?.public_id))
          .filter(Boolean)
      );
      const keepUrls = new Set(
        parsedExisting
          .map((item) => (typeof item === "object" && item?.url ? item.url : null))
          .filter(Boolean)
      );

      retainedImages = (propose.images || []).filter(
        (img) => (img?.public_id && keepIds.has(img.public_id)) || (img?.url && keepUrls.has(img.url))
      );

      const totalCount = retainedImages.length + (req.files?.length || 0);
      if (totalCount > 5) {
        safeCleanupFiles(req.files);
        return res.status(400).json({ status: false, message: "Maximum 5 images allowed per request" });
      }

      const removedImages = (propose.images || []).filter(
        (img) => !retainedImages.includes(img)
      );
      for (const img of removedImages) {
        if (img?.public_id) await cloudinary.uploader.destroy(img.public_id);
      }

      const uploadedImages = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const result = await cloudinary.uploader.upload(file.path, { folder: "Proposes" });
          uploadedImages.push({ url: result.secure_url, public_id: result.public_id });
          safeCleanupFiles([file]);
        }
      }
      propose.images = [...retainedImages, ...uploadedImages];
    } else if (req.files && req.files.length > 0) {
      if (req.files.length > 5) {
        safeCleanupFiles(req.files);
        return res.status(400).json({ status: false, message: "Maximum 5 images allowed per request" });
      }
      // Legacy replace-all behavior when existingImages is not explicitly sent
      for (const img of propose.images || []) {
        if (img.public_id) await cloudinary.uploader.destroy(img.public_id);
      }

      const uploadedImages = [];
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, { folder: "Proposes" });
        uploadedImages.push({ url: result.secure_url, public_id: result.public_id });
        safeCleanupFiles([file]);
      }
      propose.images = uploadedImages;
    }

    if (title !== undefined) propose.title = nextTitle;
    if (category !== undefined) propose.category = nextCategory;
    if (description !== undefined) propose.description = nextDescription;
    if (price !== undefined) propose.price = nextPrice;
    if (pricingType === "fixed" || pricingType === "hourly") {
      propose.pricingType = pricingType;
    }
    if (location !== undefined) propose.location = nextLocation;
    if (placeId !== undefined) propose.placeId = placeId || null;
    if (isOnline !== undefined) propose.isOnline = nextIsOnline;
    if (supportsInPerson !== undefined) propose.supportsInPerson = nextSupportsInPerson;
    propose.status = nextStatus;

    if (!nextSupportsInPerson) {
      propose.location = "";
      propose.address = "";
      propose.placeId = null;
      propose.lat = null;
      propose.lng = null;
    } else if (location !== undefined || placeId !== undefined) {
      const targetLoc = location !== undefined ? nextLocation : propose.location;
      const targetPlaceId = placeId !== undefined ? placeId : propose.placeId;
      if (targetLoc || targetPlaceId) {
        const place = targetPlaceId ? await getPlaceDetails(targetPlaceId) : { lat: null, lng: null, address: null };
        const geo = !place.lat && targetLoc ? await geocodeAddress(targetLoc) : {};
        const address = place.address || targetLoc || "";

        propose.address = address;
        propose.location = targetLoc || "";
        propose.placeId = targetPlaceId || null;
        propose.lat = place.lat ?? geo.lat ?? propose.lat ?? null;
        propose.lng = place.lng ?? geo.lng ?? propose.lng ?? null;
      }
    }

    await propose.save();
    res.json({ status: true, message: "Propose updated successfully", propose });
  } catch (error) {
    safeCleanupFiles(req.files);
    console.error("Update Propose error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

/* ----------------------------- DELETE Propose ----------------------------- */
export const deletePropose = async (req, res) => {
  try {
    const propose = await Propose.findById(req.params.id);
    if (!propose) return res.status(404).json({ message: "Propose not found" });

    if (String(propose.user) !== String(req.user?._id) && req.user?.role !== "admin") {
      return res.status(403).json({ status: false, message: "Not authorized to delete this proposal" });
    }

    // Delete images from Cloudinary
    for (const img of propose.images) {
      if (img.public_id) await cloudinary.uploader.destroy(img.public_id);
    }

    await propose.deleteOne();
    res.json({ status:true,message: "Propose deleted successfully" });
  } catch (error) {
    res.status(500).json({status:false, message: error.message });
  }
};

export const updateProposeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({ status: false, message: "ID is required" });
    }

    // Validate status
    if (status === undefined || status === null || status === "") {
      return res.status(400).json({ status: false, message: "Status is required" });
    }
    if (!ALLOWED_PROPOSE_STATUSES.has(status) && req.user?.role !== "admin") {
      return res.status(400).json({ status: false, message: "Invalid proposal status" });
    }

    // Fetch proposal first to enforce ownership/admin check
    const existing = await Propose.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: "Propose not found" });
    }

    if (String(existing.user) !== String(req.user?._id) && req.user?.role !== "admin") {
      return res.status(403).json({ status: false, message: "Not authorized to update this proposal status" });
    }

    if (existing.status === "Draft" && status === "Active") {
      const validation = validateActiveProposeFields({
        title: existing.title,
        description: existing.description,
        category: existing.category,
        price: existing.price,
        supportsInPerson: existing.supportsInPerson,
        location: existing.location,
        requireDescription: true,
      });
      if (!validation.ok) {
        return res.status(400).json({ status: false, message: validation.message });
      }
    }

    existing.status = status;
    await existing.save();

    return res.status(200).json({
      status: true,
      message: "Status updated successfully",
      data: existing
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

