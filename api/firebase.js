// api/_firebase.js — Shared Firebase Admin singleton
import admin from "firebase-admin";

let initialized = false;

export function getDb() {
  if (!initialized) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
      });
    }
    initialized = true;
  }
  return admin.firestore();
}

export const FieldValue = admin.firestore.FieldValue;
