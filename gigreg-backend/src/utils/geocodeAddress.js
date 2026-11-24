const FETCH_TIMEOUT_MS = 8000;

export async function geocodeAddress(address) {
  if (!address) return { lat: null, lng: null };
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { lat: null, lng: null };
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const data = await response.json();
    if (data.status === "OK" && data.results && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    return { lat: null, lng: null };
  } catch (err) {
    return { lat: null, lng: null };
  }
}
