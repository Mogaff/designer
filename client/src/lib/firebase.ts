// Import Firebase SDK
import { initializeApp, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Aktualisierte Firebase-Konfiguration mit der autorisierten Domain
const firebaseConfig = {
  apiKey: "AIzaSyA84jOtKbd_aFr07gt4EKH_md_XVhX-RZw",
  authDomain: "designer.haitucreations.ai", // Autorisierte Domain verwenden
  projectId: "dieseiner-7c81b",
  storageBucket: "dieseiner-7c81b.firebasestorage.app",
  messagingSenderId: "558539292154",
  appId: "1:558539292154:web:5c6a993fd80165e4e2f843"
};

console.log("Firebase config (API key redacted):", {
  ...firebaseConfig, 
  apiKey: firebaseConfig.apiKey ? "REDACTED" : "MISSING"
});

// Bevor wir Firebase initialisieren, eventuell vorhandene Session-Daten löschen
// Dies kann helfen, wenn es frühere Authentifizierungsprobleme gab
try {
  // Lokalspeicher und Sitzungsspeicher leeren, die mit Firebase zu tun haben könnten
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('firebase') || key.includes('firebaseui'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log('Cleared potentially problematic localStorage items');
} catch (e) {
  console.error('Error clearing localStorage:', e);
}

// Firebase-App initialisieren
// Wir versuchen, die App direkt zu initialisieren
let app;
try {
  // Versuchen, eine neue App zu initialisieren
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
} catch (error: any) {
  // Wenn es einen Fehler gibt, protokollieren wir ihn
  console.error('Firebase initialization error:', error);
  // Wir versuchen, die Standard-App zu verwenden
  try {
    // @ts-ignore - Import nicht gefunden, daher inline verwenden
    app = firebase.app();
    console.log('Using existing firebase app');
  } catch (e) {
    console.error('Could not retrieve existing app:', e);
    throw error;
  }
}

// Initialize Firebase Authentication
const auth = getAuth(app);

// For deployment compatibility with Replit custom domains
const isRunningOnReplit = window.location.hostname.includes('replit');

// Wichtig: Setze die authDomain explizit auf die autorisierte Domain
console.log('Setting authorized domains for authentication');
try {
  // Die offizielle, autorisierte Domain verwenden
  // @ts-ignore - accessing internal config for compatibility
  auth.config.authDomain = 'designer.haitucreations.ai';
  
  // Wir versuchen, zusätzliche Felder der Konfiguration zu setzen
  // @ts-ignore
  if (auth._config) {
    // @ts-ignore
    auth._config.authDomain = 'designer.haitucreations.ai';
  }
  
  console.log('Successfully set auth domain to designer.haitucreations.ai');
} catch (error) {
  console.error('Error setting auth domain:', error);
}

// Benutze die Gerätesprache des Browsers
auth.useDeviceLanguage();

// Create a Google Auth Provider with custom parameters
const googleProvider = new GoogleAuthProvider();

// Add scopes if needed (minimiert, um Kompatibilitätsprobleme zu vermeiden)
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

// Set custom parameters - dies hilft bei der Domain-Autorisierung
// Beachten Sie: Der "login_hint" kann manchmal zu Problemen führen
googleProvider.setCustomParameters({
  // Einfacher halten für bessere Kompatibilität
  prompt: 'select_account',
});

// Export auth services
export { 
  auth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  googleProvider,
  signOut,
  onAuthStateChanged
};