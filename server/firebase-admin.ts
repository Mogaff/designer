import * as admin from 'firebase-admin';

// Firebase Admin SDK-Initialisierung für Backend-Operationen
// In v11+ müssen wir getApps statt apps.length verwenden
let firebaseApp;
try {
  // Prüfen, ob Firebase bereits initialisiert wurde
  if (!admin.apps?.length) {
    firebaseApp = admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    });
    console.log('Firebase Admin SDK initialisiert');
  } else {
    firebaseApp = admin.app();
    console.log('Bestehende Firebase Admin-App wiederverwendet');
  }
} catch (error) {
  console.error('Firebase Admin Initialisierungsfehler:', error);
}

export default admin;

// Hilfsfunktion zum Erstellen eines benutzerdefinierten Firebase-Tokens
export async function createCustomToken(uid: string, claims?: Record<string, any>) {
  try {
    const token = await admin.auth().createCustomToken(uid, claims);
    return token;
  } catch (error) {
    console.error('Fehler beim Erstellen des benutzerdefinierten Tokens:', error);
    throw error;
  }
}

// Hilfsfunktion zum Überprüfen eines ID-Tokens
export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Fehler beim Verifizieren des ID-Tokens:', error);
    return null;
  }
}

// Hilfsfunktion zum Erstellen eines Benutzers
export async function createUser(userData: admin.auth.CreateRequest) {
  try {
    const userRecord = await admin.auth().createUser(userData);
    return userRecord;
  } catch (error) {
    console.error('Fehler beim Erstellen des Benutzers:', error);
    throw error;
  }
}