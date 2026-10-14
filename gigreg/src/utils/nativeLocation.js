import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

/**
 * Get current device coordinates and resolved city/address name
 * Supports both Native Android GPS and Web browser geolocation
 */
export const getCurrentDeviceLocation = async () => {
  let coords = null;

  if (Capacitor.isNativePlatform()) {
    try {
      let permStatus = await Geolocation.checkPermissions();
      if (permStatus.location !== "granted") {
        permStatus = await Geolocation.requestPermissions();
      }

      if (permStatus.location !== "granted") {
        throw new Error("Location permission denied");
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });

      coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (err) {
      console.warn("Native Geolocation error, falling back if possible:", err.message);
      throw err;
    }
  } else {
    // Web fallback
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported by your browser");
    }

    coords = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        (err) => reject(new Error(err.message || "Failed to retrieve location")),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  }

  if (!coords) {
    throw new Error("Could not determine current position");
  }

  // Reverse geocode to city name
  let cityName = "Current Location";
  let fullAddress = "";

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data?.address || {};
      cityName =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        addr.state ||
        "Current Location";
      fullAddress = data?.display_name || cityName;
    }
  } catch (err) {
    console.warn("Reverse geocode lookup warning:", err);
  }

  return {
    lat: coords.latitude,
    lng: coords.longitude,
    city: cityName,
    address: fullAddress,
  };
};

export default getCurrentDeviceLocation;
