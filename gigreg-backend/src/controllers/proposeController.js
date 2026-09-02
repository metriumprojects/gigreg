import Propose from "../models/Propose.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { getPlaceDetails } from "../utils/getPlaceDetails.js";
import { geocodeAddress } from "../utils/geocodeAddress.js";
/* ----------------------------- CREATE Propose ----------------------------- */
export const createPropose = async (req, res) => {
  try {
    const { title, category, description, price, location, placeId, isOnline, supportsInPerson } = req.body;

    if (!title || !category) {
      if (req.files) req.files.forEach((f) => fs.unlinkSync(f.path));
      return res.status(400).json({status:false, message: "Title and Category are required" });
    }

    // Minimum 3 images
    if (!req.files || req.files.length < 2) {
      if (req.files) req.files.forEach((f) => fs.unlinkSync(f.path));
      return res.status(400).json({status:false, message: "Minimum 2 images are required" });
    }

    // Upload images to Cloudinary
    const uploadedImages = [];
    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, { folder: "Proposes" });
      uploadedImages.push({ url: result.secure_url, public_id: result.public_id });
      fs.unlinkSync(file.path);
    }

    let lat = null, lng = null, address = location || "", resolvedPlaceId = placeId || null;
    if ((supportsInPerson === 'true' || supportsInPerson === true) && (location || placeId)) {
      const place = placeId ? await getPlaceDetails(placeId) : { lat: null, lng: null, address: null };
      const geo = !place.lat && location ? await geocodeAddress(location) : {};
      lat = place.lat ?? geo.lat ?? null;
      lng = place.lng ?? geo.lng ?? null;
      address = place.address || location || "";
    }

    const propose = await Propose.create({
      title,
      category,
      description,
      price,
      isOnline: isOnline === 'true' || isOnline === true,
      supportsInPerson: supportsInPerson === 'true' || supportsInPerson === true,
      location: location || "",
      address,
      placeId: resolvedPlaceId,
      lat,
      lng,
      images: uploadedImages,
      user: req.user._id,
    });

    res.status(201).json({status:true, message: "Propose created successfully", propose });
  } catch (error) {
    console.error("Create Propose error:", error);
    res.status(500).json({status:false, message: error.message });
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

    page = Number(page);
    limit = Number(limit);

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
    if (search?.trim()) {
      proposeFilter.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    // Handle category filtering
    if (category?.trim()) {
      proposeFilter.category = category;
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
    if (location?.trim()) {
      proposeFilter.location = { $regex: location, $options: "i" };
    }

    // ---------------------------
    // Independent Proposes Pagination
    // ---------------------------
    const total = await Propose.countDocuments(proposeFilter);

    const sortOrder = String(sort).toLowerCase() === "oldest" ? 1 : -1;

    const allProposes = await Propose.find(proposeFilter)
      .populate("user", "name email image averageRating totalRatings")
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
    const propose = await Propose.find({user:req.user.id}).populate("user", "name email image averageRating totalRatings");
    if (!propose) return res.status(404).json({status:false, message: "Propose not found" });
    res.json(propose);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/* ------------------------------ GET SINGLE Propose --------------------------- */
export const getProposeById = async (req, res) => {
  try {
    const propose = await Propose.findById(req.params.id).populate("user", "name email image averageRating totalRatings");
    if (!propose) return res.status(404).json({status:false, message: "Propose not found" });
    res.json(propose);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ----------------------------- UPDATE Propose ----------------------------- */
export const updatePropose = async (req, res) => {
  try {
    const { title, category, description, price, location, placeId, isOnline, supportsInPerson, status } = req.body;
    const propose = await Propose.findById(req.params.id);

    if (!propose) {
      if (req.files) req.files.forEach((f) => fs.unlinkSync(f.path));
      return res.status(404).json({status:false, message: "Propose not found" });
    }

    // Replace images if new ones are uploaded
    if (req.files && req.files.length > 0) {
      // Delete old from Cloudinary
      for (const img of propose.images) {
        if (img.public_id) await cloudinary.uploader.destroy(img.public_id);
      }

      const uploadedImages = [];
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, { folder: "Proposes" });
        uploadedImages.push({ url: result.secure_url, public_id: result.public_id });
        fs.unlinkSync(file.path);
      }
      propose.images = uploadedImages;
    }

    if (title) propose.title = title;
    if (category) propose.category = category;
    if (description) propose.description = description;
    if (price) propose.price = price;
    if (location) propose.location = location;
    if (placeId) propose.placeId = placeId;
    if (isOnline !== undefined) propose.isOnline = isOnline === 'true' || isOnline === true;
    if (supportsInPerson !== undefined) propose.supportsInPerson = supportsInPerson === 'true' || supportsInPerson === true;
    if (status) propose.status = status;

    if (location || placeId) {
      const place = placeId ? await getPlaceDetails(placeId) : { lat: null, lng: null, address: null };
      const geo = !place.lat && (location || propose.location) ? await geocodeAddress(location || propose.location) : {};
      const address = place.address || location || propose.address || propose.location || "";

      propose.address = address;
      propose.location = location || propose.location || "";
      propose.placeId = placeId || propose.placeId || null;
      propose.lat = place.lat ?? geo.lat ?? propose.lat ?? null;
      propose.lng = place.lng ?? geo.lng ?? propose.lng ?? null;
    }

    await propose.save();
    res.json({status:true, message: "Propose updated successfully", propose });
  } catch (error) {
    console.error("Update Propose error:", error);
    res.status(500).json({status:false, message: error.message });
  }
};

/* ----------------------------- DELETE Propose ----------------------------- */
export const deletePropose = async (req, res) => {
  try {
    const propose = await Propose.findById(req.params.id);
    if (!propose) return res.status(404).json({ message: "Propose not found" });

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

    // Update proposal
    const propose = await Propose.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!propose) {
      return res.status(404).json({ status: false, message: "Propose not found" });
    }

    return res.status(200).json({
      status: true,
      message: "Status updated successfully",
      data: propose
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

