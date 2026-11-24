import mongoose from "mongoose";
import Favorite from "../models/Favorite.js";
import User from "../models/User.js";

export const toggleFavorite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;   // propose/listing id
        const { type } = req.body;   // "propose", "listing"

        if (!["propose", "listing"].includes(type)) {
            return res.status(400).json({
                status: false,
                message: "Invalid type. Use propose, listing",
            });
        }

        // Build dynamic query
        let query = { user: userId };
        query[type] = id;

        // Check if item already in favorites
        const existingFavorite = await Favorite.findOne(query);

        if (existingFavorite) {
            await existingFavorite.deleteOne();
            return res.status(200).json({
                status: true,
                message: "Removed from favorites",
            });
        }

        // Create new favorite
        const newFavorite = await Favorite.create({
            user: userId,
            [type]: id,
            type: type
        });

        return res.status(200).json({
            status: true,
            message: "Added to favorites",
            data: newFavorite
        });

    } catch (error) {
        console.error("toggleFavorite error:", error);
        res.status(500).json({ status: false, message: error.message });
    }
};


export const getUserFavorites = async (req, res) => {
    try {
        const userId = req.user.id;

        const favorites = await Favorite.find({ user: userId })
            .populate({
                path: "propose",
                populate: {
                    path: "user",
                    select: "name image averageRating totalRatings"
                }
            })
            .populate({
                path: "listing",
                populate: {
                    path: "createdBy",
                    select: "name image averageRating totalRatings"
                }
            });

        res.status(200).json({
            status: true,
            data: favorites
        });

    } catch (error) {
        console.error("getUserFavorites error:", error);
        res.status(500).json({ status: false, message: error.message });
    }
};

export const getTeacherFavoritesByID = async (req, res) => {
  try {
    const createdById = req.params.id;
    const isSelfOrAdmin =
      String(req.user?._id || "") === String(createdById) || req.user?.role === "admin";

    if (!isSelfOrAdmin) {
      return res.status(403).json({
        status: false,
        message: "Not authorized to view this user's favorites",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(createdById)) {
      return res.status(400).json({
        status: false,
        message: "Invalid seller ID",
      });
    }

    const ownerObjectId = new mongoose.Types.ObjectId(createdById);

    // Pagination inputs (bounded to prevent unbounded scans)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const favorites = await Favorite.aggregate([
      // LOOKUP: propose
      {
        $lookup: {
          from: "proposes",
          localField: "propose",
          foreignField: "_id",
          as: "propose"
        }
      },

      // LOOKUP: listing
      {
        $lookup: {
          from: "listings",
          localField: "listing",
          foreignField: "_id",
          as: "listing"
        }
      },

      // UNWIND
      { $unwind: { path: "$propose", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$listing", preserveNullAndEmptyArrays: true } },

      // MATCH -> owner ObjectId filter
      {
        $match: {
          $or: [
            { "propose.user": ownerObjectId },
            { "listing.createdBy": ownerObjectId }
          ]
        }
      },

      // FACET → data + total in one query
      {
        $facet: {
          metadata: [{ $count: "total" }],   // total count
          data: [
            { $skip: skip },
            { $limit: limit }
          ]
        }
      }
    ]);

    const total = favorites[0]?.metadata[0]?.total || 0;

    return res.status(200).json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: favorites[0]?.data || []
    });

  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const getUserFavoritesByUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const isSelfOrAdmin =
            String(req.user?._id || "") === String(userId) || req.user?.role === "admin";

        if (!isSelfOrAdmin) {
            const targetUser = await User.findById(userId).select("publicType").lean();
            if (!targetUser || targetUser.publicType !== true) {
                return res.status(403).json({
                    status: false,
                    message: "This user's favorites are private",
                });
            }
        }

        const favorites = await Favorite.find({ user: userId })
            .populate({
                path: "propose",
                populate: {
                    path: "user",
                    select: "name image averageRating totalRatings"
                }
            })
            .populate({
                path: "listing",
                populate: {
                    path: "createdBy",
                    select: "name image averageRating totalRatings"
                }
            });

        res.status(200).json({
            status: true,
            data: favorites
        });

    } catch (error) {
        console.error("getUserFavorites error:", error);
        res.status(500).json({ status: false, message: error.message });
    }
};
