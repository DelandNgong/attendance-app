// Firebase project connection — set up in the next session.
//
// 1. Create a project at https://console.firebase.google.com
// 2. Enable Authentication (Email/Password) and Firestore Database
// 3. In Project Settings > General, register a Web App and copy the config object here
// 4. NEVER commit real Firebase keys directly if the repo is public — use a .env file instead
//    (Vite reads variables prefixed with VITE_, e.g. import.meta.env.VITE_FIREBASE_API_KEY)

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "TODO",
  authDomain: "TODO",
  projectId: "TODO",
  storageBucket: "TODO",
  messagingSenderId: "TODO",
  appId: "TODO",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
