import React, { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Network } from "@capacitor/network";
import { Capacitor } from "@capacitor/core";

const OFFLINE_TOAST_ID = "offline-network-status";
const ONLINE_TOAST_ID = "online-network-status";

export const NetworkStatusListener = () => {
  const isFirstRender = useRef(true);
  const wasOffline = useRef(false);

  const handleStatusChange = (connected) => {
    if (!connected) {
      wasOffline.current = true;
      if (!toast.isActive(OFFLINE_TOAST_ID)) {
        toast.warn("You are currently offline. Please check your internet connection.", {
          toastId: OFFLINE_TOAST_ID,
          autoClose: false,
          closeOnClick: false,
          closeButton: false,
          draggable: false,
        });
      }
    } else {
      if (wasOffline.current) {
        toast.dismiss(OFFLINE_TOAST_ID);
        toast.success("Back online!", {
          toastId: ONLINE_TOAST_ID,
          autoClose: 2500,
        });
        wasOffline.current = false;
      }
    }
  };

  useEffect(() => {
    let networkListenerHandle = null;

    const setupNetworkMonitoring = async () => {
      // Check initial state
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Network.getStatus();
          if (!status.connected) {
            handleStatusChange(false);
          }
          networkListenerHandle = await Network.addListener(
            "networkStatusChange",
            (status) => {
              handleStatusChange(status.connected);
            }
          );
        } catch (err) {
          console.warn("Capacitor Network plugin initialization error:", err);
        }
      } else {
        // Web browser environment
        if (typeof window !== "undefined") {
          if (!window.navigator.onLine) {
            handleStatusChange(false);
          }
          const handleOnline = () => handleStatusChange(true);
          const handleOffline = () => handleStatusChange(false);

          window.addEventListener("online", handleOnline);
          window.addEventListener("offline", handleOffline);

          return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
          };
        }
      }
    };

    const cleanupPromise = setupNetworkMonitoring();

    return () => {
      if (networkListenerHandle && typeof networkListenerHandle.remove === "function") {
        networkListenerHandle.remove();
      }
      cleanupPromise.then((cleanupFn) => {
        if (typeof cleanupFn === "function") cleanupFn();
      });
    };
  }, []);

  return null;
};

export default NetworkStatusListener;
