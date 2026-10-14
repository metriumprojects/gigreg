import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

/**
 * Capture photo from Camera or pick from Gallery on native device
 * On web, falls back to standard file picker dialog
 * @param {Object} options
 * @param {CameraSource} [options.source=CameraSource.Prompt] - Prompt, Camera, or Photos
 * @param {number} [options.quality=90] - JPEG quality 1-100
 * @returns {Promise<File|null>} Standard File object ready for FormData / Axios upload
 */
export const pickNativeImage = async ({
  source = CameraSource.Prompt,
  quality = 90,
} = {}) => {
  if (Capacitor.isNativePlatform()) {
    try {
      const permissions = await Camera.checkPermissions();
      if (
        permissions.camera !== "granted" ||
        permissions.photos !== "granted"
      ) {
        await Camera.requestPermissions();
      }

      const photo = await Camera.getPhoto({
        quality,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source, // Prompts user: Camera vs Photos
      });

      if (!photo || !photo.webPath) {
        return null;
      }

      // Convert URI to File object
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const filename = `photo_${Date.now()}.${photo.format || "jpg"}`;
      const file = new File([blob], filename, {
        type: `image/${photo.format || "jpeg"}`,
      });

      return file;
    } catch (err) {
      if (err.message?.includes("User cancelled") || err.message?.includes("canceled")) {
        return null; // User simply closed the picker
      }
      console.warn("pickNativeImage error:", err);
      throw err;
    }
  }

  // Web fallback: programmatically trigger file input
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files?.[0] || null;
      resolve(file);
    };
    input.click();
  });
};

export default pickNativeImage;
