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

// Haversine formula to calculate distance between two lat/lng points in km
export function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== "number" ||
    typeof lon1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lon2 !== "number"
  )
    return null;
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    0.5 -
    Math.cos(dLat) / 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      (1 - Math.cos(dLon)) / 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 10) / 10;
}
