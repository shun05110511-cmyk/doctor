import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBF9mWxS7rQrV78rlg7fgWgbHBAT_NRuNs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "doctor-46910.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "doctor-46910",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "doctor-46910.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "412047865393",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:412047865393:web:50c21c899d7e52b0f2c710",
};

// 全端末での全自動クラウド同期を有効化
export const isFirebaseConfigured = true;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);

export { app, auth, db };
