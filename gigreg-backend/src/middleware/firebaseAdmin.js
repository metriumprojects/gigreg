import admin from "firebase-admin";

const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!base64) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 is missing!");
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64");
}

const jsonString = Buffer.from(base64, "base64").toString("utf8");
const serviceAccount = JSON.parse(jsonString);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export default admin;
