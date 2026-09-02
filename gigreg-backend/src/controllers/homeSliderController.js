import fs from "fs";
import HomeSlider from "../models/HomeSlider.js";
import Listing from "../models/Listing.js";
import cloudinary from "../config/cloudinary.js";

const ensureAdmin = (req, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ status: false, message: "Admin access required" });
    return false;
  }
  return true;
};

const populateListing = {
  path: "listing",
  select: "title slug location address coverImage status createdBy",
  populate: {
    path: "createdBy",
    select: "name image",
  },
};

const cleanupTempFile = (file) => {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
};

export const getActiveHomeSliders = async (req, res) => {
  try {
    const slides = await HomeSlider.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .populate(populateListing);

    const activeSlides = slides.filter(
      (slide) => slide.listing && slide.listing.status === "Active"
    );

    res.json({ status: true, slides: activeSlides });
  } catch (error) {
    console.error("Get active home sliders error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getAllHomeSliders = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const slides = await HomeSlider.find()
      .sort({ order: 1, createdAt: -1 })
      .populate(populateListing);

    res.json({ status: true, slides });
  } catch (error) {
    console.error("Get all home sliders error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const createHomeSlider = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      cleanupTempFile(req.file);
      return;
    }

    const { listingId, quote = "", order = 0, isActive = true } = req.body;

    if (!listingId) {
      cleanupTempFile(req.file);
      return res.status(400).json({ status: false, message: "Listing is required" });
    }

    if (!req.file) {
      return res.status(400).json({ status: false, message: "Slider image is required" });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      cleanupTempFile(req.file);
      return res.status(404).json({ status: false, message: "Listing not found" });
    }

    const existing = await HomeSlider.findOne({ listing: listingId });
    if (existing) {
      cleanupTempFile(req.file);
      return res.status(400).json({
        status: false,
        message: "This listing is already added to the slider",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "home-slider",
    });
    cleanupTempFile(req.file);

    const slide = await HomeSlider.create({
      listing: listingId,
      image: { url: result.secure_url, public_id: result.public_id },
      quote: String(quote || "").trim(),
      order: Number(order) || 0,
      isActive: String(isActive) !== "false",
    });

    const populated = await HomeSlider.findById(slide._id).populate(populateListing);

    res.status(201).json({
      status: true,
      message: "Slider item created successfully",
      slide: populated,
    });
  } catch (error) {
    cleanupTempFile(req.file);
    console.error("Create home slider error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateHomeSlider = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      cleanupTempFile(req.file);
      return;
    }

    const slide = await HomeSlider.findById(req.params.id);
    if (!slide) {
      cleanupTempFile(req.file);
      return res.status(404).json({ status: false, message: "Slider item not found" });
    }

    const { listingId, quote, order, isActive } = req.body;

    if (listingId && String(listingId) !== String(slide.listing)) {
      const listing = await Listing.findById(listingId);
      if (!listing) {
        cleanupTempFile(req.file);
        return res.status(404).json({ status: false, message: "Listing not found" });
      }

      const existing = await HomeSlider.findOne({
        listing: listingId,
        _id: { $ne: slide._id },
      });
      if (existing) {
        cleanupTempFile(req.file);
        return res.status(400).json({
          status: false,
          message: "This listing is already added to the slider",
        });
      }

      slide.listing = listingId;
    }

    if (quote !== undefined) slide.quote = String(quote || "").trim();
    if (order !== undefined && order !== "") slide.order = Number(order) || 0;
    if (isActive !== undefined) slide.isActive = String(isActive) !== "false";

    if (req.file) {
      if (slide.image?.public_id) {
        await cloudinary.uploader.destroy(slide.image.public_id);
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "home-slider",
      });
      slide.image = { url: result.secure_url, public_id: result.public_id };
      cleanupTempFile(req.file);
    }

    await slide.save();
    const populated = await HomeSlider.findById(slide._id).populate(populateListing);

    res.json({
      status: true,
      message: "Slider item updated successfully",
      slide: populated,
    });
  } catch (error) {
    cleanupTempFile(req.file);
    console.error("Update home slider error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteHomeSlider = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const slide = await HomeSlider.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({ status: false, message: "Slider item not found" });
    }

    if (slide.image?.public_id) {
      await cloudinary.uploader.destroy(slide.image.public_id);
    }

    await slide.deleteOne();

    res.json({ status: true, message: "Slider item deleted successfully" });
  } catch (error) {
    console.error("Delete home slider error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};
