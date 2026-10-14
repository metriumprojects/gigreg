import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { toast } from "react-toastify";

/**
 * Manages native mobile lifecycle events:
 * 1. Physical Android back-button: navigates backwards instead of exiting immediately.
 * 2. Deep linking: opens app when link is clicked from outside.
 */
export const NativeAppManager = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressTime = useRef(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListenerHandle = null;
    let urlListenerHandle = null;

    const setupAppListeners = async () => {
      // 1. Hardware Back Button Listener
      backListenerHandle = await App.addListener("backButton", ({ canGoBack }) => {
        const pathname = window.location.pathname;

        // If at root home page, double tap to exit
        if (pathname === "/" || pathname === "/listing") {
          const now = Date.now();
          if (now - lastBackPressTime.current < 2000) {
            App.exitApp();
          } else {
            lastBackPressTime.current = now;
            toast.info("Press back again to exit", { autoClose: 1500 });
          }
        } else {
          // Navigate back in React Router
          navigate(-1);
        }
      });

      // 2. Deep Link Listener (appUrlOpen)
      urlListenerHandle = await App.addListener("appUrlOpen", (event) => {
        try {
          const url = new URL(event.url);
          const slug = url.pathname + url.search + url.hash;
          if (slug) {
            navigate(slug);
          }
        } catch (err) {
          console.warn("Failed to parse deep link URL:", err);
        }
      });
    };

    setupAppListeners();

    return () => {
      if (backListenerHandle && typeof backListenerHandle.remove === "function") {
        backListenerHandle.remove();
      }
      if (urlListenerHandle && typeof urlListenerHandle.remove === "function") {
        urlListenerHandle.remove();
      }
    };
  }, [navigate]);

  return null;
};

export default NativeAppManager;
