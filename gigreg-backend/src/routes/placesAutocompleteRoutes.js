
import express from 'express';
import fetch from 'node-fetch';
const router = express.Router();

const getPlacesApiKey = () =>
  process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY;

const sendGoogleError = (res, data, fallbackMessage) => {
  const status = data?.status || 'UNKNOWN_ERROR';
  const message = data?.error_message || fallbackMessage;

  console.error(`Google Places API ${status}: ${message}`);
  return res.status(502).json({ predictions: [], status, error: message });
};

// GET /api/places-autocomplete?input=delhi
router.get('/places-autocomplete', async (req, res) => {
  const input = req.query.input;
  if (!input || input.length < 3) {
    return res.json({ predictions: [] });
  }
  try {
    const apiKey = getPlacesApiKey();
    if (!apiKey) {
      return res.status(503).json({
        predictions: [],
        status: 'CONFIGURATION_ERROR',
        error: 'GOOGLE_PLACES_API_KEY is not configured',
      });
    }
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(data.status)) {
      return sendGoogleError(res, data, 'Google Places autocomplete failed');
    }

    res.json({ predictions: data.predictions || [], status: data.status });
  } catch (error) {
    console.error('Google Places autocomplete request failed:', error);
    res.status(502).json({ predictions: [], status: 'UPSTREAM_ERROR', error: 'Failed to fetch suggestions' });
  }
});

// GET /api/places-details?placeId=ChIJ...
router.get('/places-details', async (req, res) => {
  const placeId = req.query.placeId;
  if (!placeId) {
    return res.status(400).json({ error: 'placeId is required' });
  }

  try {
    const apiKey = getPlacesApiKey();
    if (!apiKey) {
      return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY is not configured' });
    }
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,name,formatted_address&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.status !== 'OK') {
      return sendGoogleError(res, data, 'Google Place Details failed');
    }

    const location = data?.result?.geometry?.location;
    res.json({
      place: data?.result || null,
      lat: typeof location?.lat === 'number' ? location.lat : null,
      lng: typeof location?.lng === 'number' ? location.lng : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch place details' });
  }
});

export default router;
