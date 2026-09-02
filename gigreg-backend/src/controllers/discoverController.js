import Listing from "../models/Listing.js";
import { geocodeAddress } from "../utils/geocodeAddress.js";
import {
  SUPPORTED_CURRENCIES,
  convertCurrency,
  convertToUsd,
  requireCurrency,
} from "../services/currencyService.js";

const geocodeCache = new Map();
const GEOCODE_CACHE_MS = 24 * 60 * 60 * 1000;

const getCachedGeocode = async (location) => {
  const key = String(location).trim().toLowerCase();
  const cached = geocodeCache.get(key);
  if (cached && Date.now() - cached.cachedAt < GEOCODE_CACHE_MS) return cached.value;
  const value = await geocodeAddress(location);
  geocodeCache.set(key, { value, cachedAt: Date.now() });
  return value;
};

const buildPriceFilters = async ({ minPrice, maxPrice, currency }) => {
  if (minPrice === undefined || maxPrice === undefined || minPrice === "" || maxPrice === "") {
    return { listingPrice: null };
  }

  const filterCurrency = requireCurrency(currency);
  const usdMin = await convertToUsd(minPrice, filterCurrency);
  const usdMax = await convertToUsd(maxPrice, filterCurrency);
  const listingRanges = await Promise.all(
    SUPPORTED_CURRENCIES.map(async (listingCurrency) => {
      const min = await convertCurrency(minPrice, filterCurrency, listingCurrency);
      const max = await convertCurrency(maxPrice, filterCurrency, listingCurrency);
      return {
        currency: listingCurrency,
        price: { $gte: min.amount, $lte: max.amount },
      };
    })
  );

  return {
    listingPrice: {
      $or: [
        ...listingRanges,
        {
          currency: { $exists: false },
          price: { $gte: usdMin, $lte: usdMax },
        },
      ],
    },
  };
};

export const getDiscoverFeed = async (req, res) => {
  try {
    let {
      page,
      limit,
      search = "",
      minPrice,
      maxPrice,
      isOnline,
      supportsInPerson,
      location,
      category,
      currency = "USD",
      lat,
      lng,
      radiusKm = 50,
    } = req.query;

    page = Number(page) || 1;
    limit = Number(limit) || 20;
    const skip = (page - 1) * limit;

    const listingMatch = { status: "Active" };
    const listingAndFilters = [];
    const { listingPrice } = await buildPriceFilters({
      minPrice,
      maxPrice,
      currency,
    });

    if (listingPrice) {
      listingAndFilters.push(listingPrice);
    }

    if (search.trim()) {
      listingAndFilters.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      });
    }

    const wantsInPerson = supportsInPerson === "true";
    if (wantsInPerson) {
      listingMatch.supportsInPerson = true;
    } else if (isOnline !== undefined) {
      listingMatch.isOnline = isOnline === "true";
    }

    if (category?.trim()) {
      listingMatch.category = { $regex: category, $options: "i" };
    }

    let geoCoords = null;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      geoCoords = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    } else if (location?.trim()) {
      const geo = await getCachedGeocode(location);
      if (geo?.lat && geo?.lng) {
        geoCoords = {
          type: "Point",
          coordinates: [geo.lng, geo.lat],
        };
      } else {
        listingAndFilters.push({
          $or: [
            { location: { $regex: location, $options: "i" } },
            { address: { $regex: location, $options: "i" } },
          ],
        });
      }
    }

    if (geoCoords) {
      const radiusRadians = Math.max(1, Number(radiusKm) || 50) / 6378.1;
      listingMatch.geoLocation = {
        $geoWithin: {
          $centerSphere: [geoCoords.coordinates, radiusRadians],
        },
      };
    }

    if (listingAndFilters.length) listingMatch.$and = listingAndFilters;

    const listingTotal = await Listing.countDocuments(listingMatch);
    const total = listingTotal;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const feed = await Listing.aggregate([
      { $match: listingMatch },
      { $addFields: { feedType: "listing" } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
          pipeline: [
            { $project: { name: 1, email: 1, image: 1, averageRating: 1, totalRatings: 1 } },
          ],
        },
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
    ]);

    res.json({
      success: true,
      feed,
      listings: feed,
      listingTotal,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      page,
      limit,
    });
  } catch (error) {
    console.error("Get discover feed error:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};
