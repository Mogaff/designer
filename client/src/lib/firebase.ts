// Import Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase-Konfiguration mit der ursprünglichen Firebase-Domain
const firebaseConfig = {
  apiKey: "AIzaSyA84jOtKbd_aFr07gt4EKH_md_XVhX-RZw",
  authDomain: "dieseiner-7c81b.firebaseapp.com", // Die originale Firebase-Domain verwenden
  projectId: "dieseiner-7c81b",
  storageBucket: "dieseiner-7c81b.appspot.com",
  messagingSenderId: "558539292154",
  appId: "1:558539292154:web:5c6a993fd80165e4e2f843"
};

console.log("Initializing Firebase with standard configuration");

// Einfache Firebase-Initialisierung ohne irgendwelche komplexen Anpassungen
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Standard Google Auth Provider ohne zusätzliche Parameter
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Einfache Einstellungen für den Login-Dialog
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Nur die wesentlichen Dienste exportieren - wir verwenden keine Redirects mehr
export { 
  auth, 
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged
};