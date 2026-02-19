import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FB_API_KEY,
  authDomain: process.env.FB_AUTH_DOMAIN,
  projectId: process.env.FB_PROJECT_ID,
};

let app;

if (!global._firebaseApp) {
  app = initializeApp(firebaseConfig);
  global._firebaseApp = app;
} else {
  app = global._firebaseApp;
}

export const db = getFirestore(app);
