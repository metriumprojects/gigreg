import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { toast } from "react-toastify";

/**
 * Open native share sheet (WhatsApp, Messenger, SMS, Copy, etc.)
 * With Web Share API and Clipboard fallback
 */
export const shareNativeContent = async ({
  title = "GigMake",
  text = "",
  url = window.location.href,
  dialogTitle = "Share with friends",
} = {}) => {
  if (Capacitor.isNativePlatform()) {
    try {
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title,
          text,
          url,
          dialogTitle,
        });
        return { success: true };
      }
    } catch (err) {
      if (!err.message?.includes("cancelled") && !err.message?.includes("dismissed")) {
        console.warn("Native share error:", err);
      }
    }
  }

  // Web fallback: navigator.share
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { success: true };
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("Web share error:", err);
      }
    }
  }

  // Final fallback: copy link to clipboard
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
    return { success: true, copied: true };
  } catch {
    toast.info("Please copy this link: " + url);
    return { success: false };
  }
};

export default shareNativeContent;
