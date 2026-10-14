import admin from "firebase-admin";

export const getFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin;
  }

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64) {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_BASE64 is missing. Firebase Admin disabled.");
    return null;
  }

  try {
    const jsonString = Buffer.from(base64, "base64").toString("utf8");
    const serviceAccount = JSON.parse(jsonString);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin;
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error.message);
    return null;
  }
};

export default getFirebaseAdmin;

