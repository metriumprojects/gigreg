import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { toast } from "react-toastify";
import api from "../redux/api";

let isInitialized = false;

/**
 * Initialize Push Notifications for native mobile devices (Android/iOS)
 * @param {Function} [navigate] - React Router navigate function for deep linking on notification tap
 */
export const initPushNotifications = async (navigate) => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (isInitialized) {
    return;
  }
  isInitialized = true;

  try {
    // 1. Create Android Notification Channel
    if (Capacitor.getPlatform() === "android") {
      try {
        await PushNotifications.createChannel({
          id: "gigmake_notifications",
          name: "GigMake Notifications",
          description: "GigMake updates, messages, orders, and offers",
          importance: 5, // High importance (heads-up notification)
          visibility: 1,
          sound: "default",
          vibration: true,
          lights: true,
        });
      } catch (err) {
        console.warn("Error creating notification channel:", err);
      }
    }

    // 2. Check and request permissions
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.warn("Push notification permission not granted");
      return;
    }

    // 3. Register with Apple / Google APNs/FCM
    await PushNotifications.register();

    // 4. Token received
    await PushNotifications.addListener("registration", async (token) => {
      console.log("Push notification registration token:", token.value);
      try {
        localStorage.setItem("fcm_token", token.value);
        // Only send to backend if user is authenticated
        const authToken = localStorage.getItem("token");
        if (authToken) {
          await api.post("/users/save-push-token", {
            token: token.value,
            platform: Capacitor.getPlatform(),
          });
        }
      } catch (error) {
        console.error("Failed to register push token with backend:", error);
      }
    });

    // 5. Registration error
    await PushNotifications.addListener("registrationError", (error) => {
      console.error("Error on push notification registration:", error);
    });

    // 6. Push notification received while app is in foreground
    await PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("Push notification received in foreground:", notification);
        const title = notification.title || "GigMake";
        const body = notification.body || "";
        toast.info(body ? `${title}\n${body}` : title, {
          autoClose: 4000,
          onClick: () => {
            handleNotificationAction(notification.data, navigate);
          },
        });
      }
    );

    // 7. Push notification tapped by user
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log("Push notification tapped:", action);
        const data = action.notification.data;
        handleNotificationAction(data, navigate);
      }
    );
  } catch (err) {
    console.error("PushNotifications init error:", err);
  }
};

/**
 * Handle notification tap navigation / deep linking
 */
export const handleNotificationAction = (data, navigate) => {
  if (!navigate || !data) return;

  try {
    const type = data.type;
    if (type === "chat" && data.roomId) {
      navigate(`/chat/${data.roomId}`);
    } else if (type === "booking") {
      navigate("/profile");
    } else if (data.url) {
      navigate(data.url);
    }
  } catch (err) {
    console.error("Error handling notification action:", err);
  }
};

/**
 * Unregister push token on user logout
 */
export const unregisterPushToken = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const token = localStorage.getItem("fcm_token");
    if (token) {
      await api.post("/users/remove-push-token", { token }).catch(() => {});
      localStorage.removeItem("fcm_token");
    }
  } catch (err) {
    console.error("Error unregistering push token:", err);
  }
};

export default initPushNotifications;
