import fetch from "node-fetch";

export async function geocodeAddress(address) {
  if (!address) return { lat: null, lng: null };
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY || "AIzaSyAMNesHvDnqE5YV41TuJB3Ym3MOfcbsbv0";
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  try {
    const response = await fetch(url);
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
