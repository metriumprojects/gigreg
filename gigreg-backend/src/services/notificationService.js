import User from "../models/User.js";
import { getFirebaseAdmin } from "../middleware/firebaseAdmin.js";

/**
 * Send push notification to one or more user IDs via Firebase Cloud Messaging
 * @param {Object} options
 * @param {string|string[]} options.userIds - Single user ID or array of user IDs
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body text
 * @param {Object} [options.data] - Custom key-value pairs (will be converted to strings)
 * @param {string} [options.imageUrl] - Optional image URL
 */
export const sendPushNotification = async ({
  userIds,
  title,
  body,
  data = {},
  imageUrl = null,
}) => {
  try {
    const admin = getFirebaseAdmin();
    if (!admin) {
      console.warn("⚠️ Push notification skipped: Firebase Admin is not initialized.");
      return { success: false, reason: "Firebase Admin not initialized" };
    }

    if (!userIds || (Array.isArray(userIds) && userIds.length === 0)) {
      return { success: false, reason: "No user IDs provided" };
    }

    const targetIds = Array.isArray(userIds) ? userIds : [userIds];

    // Find users with their tokens
    const users = await User.find(
      { _id: { $in: targetIds } },
      "_id fcmTokens"
    ).lean();

    if (!users || users.length === 0) {
      return { success: false, reason: "No users found" };
    }

    // Collect tokens with mapping to user ID for cleanup if token expired
    const tokenMap = new Map(); // token -> userId
    for (const user of users) {
      if (Array.isArray(user.fcmTokens)) {
        for (const item of user.fcmTokens) {
          if (item?.token && typeof item.token === "string") {
            tokenMap.set(item.token.trim(), String(user._id));
          }
        }
      }
    }

    const tokens = Array.from(tokenMap.keys());
    if (tokens.length === 0) {
      return { success: true, count: 0, reason: "No registered push tokens" };
    }

    // Ensure all data values are strings (Firebase FCM requirement)
    const stringifiedData = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        stringifiedData[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
      }
    }

    // Include basic title/body in data payload for reliable foreground handling
    stringifiedData.title = title || "";
    stringifiedData.body = body || "";

    const messagePayload = {
      tokens,
      notification: {
        title: title || "GigMake",
        body: body || "",
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: stringifiedData,
      android: {
        priority: "high",
        notification: {
          channelId: "gigmake_notifications",
          sound: "default",
          icon: "ic_launcher",
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(messagePayload);

    // Clean up stale or unregistered tokens
    const deadTokensByUser = new Map(); // userId -> [deadTokens]
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (
          errCode === "messaging/invalid-registration-token" ||
          errCode === "messaging/registration-token-not-registered"
        ) {
          const deadToken = tokens[idx];
          const ownerId = tokenMap.get(deadToken);
          if (ownerId) {
            if (!deadTokensByUser.has(ownerId)) {
              deadTokensByUser.set(ownerId, []);
            }
            deadTokensByUser.get(ownerId).push(deadToken);
          }
        }
      }
    });

    if (deadTokensByUser.size > 0) {
      for (const [userId, deadTokens] of deadTokensByUser.entries()) {
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { token: { $in: deadTokens } } },
        }).catch((err) =>
          console.error(`Failed to remove dead push tokens for user ${userId}:`, err.message)
        );
      }
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error("❌ sendPushNotification error:", error);
    return { success: false, error: error.message };
  }
};

export default sendPushNotification;
