import fetch from "node-fetch";

export async function getPlaceDetails(placeId) {
  if (!placeId) return { lat: null, lng: null, address: null };
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || "AIzaSyAMNesHvDnqE5YV41TuJB3Ym3MOfcbsbv0";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,formatted_address,address_component&key=${apiKey}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    const loc = data?.result?.geometry?.location || {};
    const components = data?.result?.address_components || [];
    const admin1 = components.find((c) => c.types?.includes("administrative_area_level_1"));
    const admin2 = components.find((c) => c.types?.includes("administrative_area_level_2"));

    const formatted = data?.result?.formatted_address || null;
    const adminAddress = [admin2?.long_name, admin1?.long_name].filter(Boolean).join(", ");
    const address = adminAddress || formatted || null;

    return {
      lat: typeof loc.lat === "number" ? loc.lat : null,
      lng: typeof loc.lng === "number" ? loc.lng : null,
      address,
    };
  } catch (err) {
    return { lat: null, lng: null, address: null };
  }
}
