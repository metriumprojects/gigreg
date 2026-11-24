
import express from 'express';
import { createRateLimiter } from '../middleware/securityMiddleware.js';
import { isOriginAllowed } from '../config/corsConfig.js';
const router = express.Router();

const PLACES_TIMEOUT_MS = 8000;
const AUTOCOMPLETE_CACHE_TTL_MS = 10 * 60 * 1000;
const DETAILS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PLACES_CACHE_ENTRIES = 500;

const autocompleteCache = new Map();
const detailsCache = new Map();

const getCached = (cache, key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCached = (cache, key, value, ttlMs) => {
  if (cache.size >= MAX_PLACES_CACHE_ENTRIES && !cache.has(key)) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const placesRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  keyPrefix: 'places',
  message: 'Too many location requests. Please slow down.',
});

const requireTrustedPlacesOrigin = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !isOriginAllowed(origin)) {
    return res.status(403).json({ predictions: [], error: 'Forbidden origin' });
  }
  next();
};

const getPlacesApiKey = () =>
  process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY;

const sendGoogleError = (res, data, fallbackMessage) => {
  const status = data?.status || 'UNKNOWN_ERROR';
  const upstreamMessage = data?.error_message || fallbackMessage;

  console.error(`Google Places API ${status}: ${upstreamMessage}`);
  const clientMessage =
    process.env.NODE_ENV === 'production' ? fallbackMessage : upstreamMessage;
  return res.status(502).json({ predictions: [], status, error: clientMessage });
};

// GET /api/places-autocomplete?input=delhi
router.get('/places-autocomplete', requireTrustedPlacesOrigin, placesRateLimiter, async (req, res) => {
  const input = typeof req.query.input === 'string' ? req.query.input.trim() : '';
  if (input.length < 3 || input.length > 200) {
    return res.json({ predictions: [] });
  }

  const cacheKey = input.toLowerCase();
  const cachedPayload = getCached(autocompleteCache, cacheKey);
  if (cachedPayload) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json(cachedPayload);
  }

  try {
    const apiKey = getPlacesApiKey();
    if (!apiKey) {
      return res.status(503).json({
        predictions: [],
        status: 'CONFIGURATION_ERROR',
        error: 'Location service is temporarily unavailable',
      });
    }
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(PLACES_TIMEOUT_MS) });
    const data = await response.json();
    if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(data.status)) {
      return sendGoogleError(res, data, 'Location autocomplete failed');
    }

    const payload = { predictions: data.predictions || [], status: data.status };
    setCached(autocompleteCache, cacheKey, payload, AUTOCOMPLETE_CACHE_TTL_MS);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(payload);
  } catch (error) {
    console.error('Google Places autocomplete request failed:', error?.message || error);
    res.status(502).json({ predictions: [], status: 'UPSTREAM_ERROR', error: 'Failed to fetch suggestions' });
  }
});

// GET /api/places-details?placeId=ChIJ...
router.get('/places-details', requireTrustedPlacesOrigin, placesRateLimiter, async (req, res) => {
  const placeId = typeof req.query.placeId === 'string' ? req.query.placeId.trim() : '';
  if (!placeId || placeId.length > 256) {
    return res.status(400).json({ error: 'Valid placeId is required' });
  }

  const cachedPayload = getCached(detailsCache, placeId);
  if (cachedPayload) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.json(cachedPayload);
  }

  try {
    const apiKey = getPlacesApiKey();
    if (!apiKey) {
      return res.status(503).json({ error: 'Location service is temporarily unavailable' });
    }
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,name,formatted_address&key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(PLACES_TIMEOUT_MS) });
    const data = await response.json();

    if (!response.ok || data.status !== 'OK') {
      return sendGoogleError(res, data, 'Location details lookup failed');
    }

    const location = data?.result?.geometry?.location;
    const payload = {
      place: data?.result || null,
      lat: typeof location?.lat === 'number' ? location.lat : null,
      lng: typeof location?.lng === 'number' ? location.lng : null,
    };
    setCached(detailsCache, placeId, payload, DETAILS_CACHE_TTL_MS);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(payload);
  } catch (error) {
    console.error('Google Place Details request failed:', error?.message || error);
    res.status(502).json({ error: 'Failed to fetch place details' });
  }
});

export default router;
