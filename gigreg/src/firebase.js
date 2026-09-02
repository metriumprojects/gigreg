// Import Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyCUDooj-9d7c6IX2EUZ7lHTk5E-6goPNkI",
  authDomain: "gigslide-24d4e.firebaseapp.com",
  projectId: "gigslide-24d4e",
  storageBucket: "gigslide-24d4e.firebasestorage.app",
  messagingSenderId: "192141687455",
  appId: "1:192141687455:web:c4be4f314388ec7ac500aa",
  measurementId: "G-K4LXKHTCLR"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth + Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
