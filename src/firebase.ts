import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  onAuthStateChanged, 
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";

// FIRESTORE RULES — Set these in Firebase Console > Firestore > Rules:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /users/{userId} {
//       allow read, write: if request.auth.uid == userId;
//     }
//     match /orders/{orderId} {
//       allow create: if request.auth != null;
//       allow read: if request.auth.uid == resource.data.userId;
//       allow update: if false;
//     }
//   }
// }

const firebaseConfig = {
  apiKey: "AIzaSyAjWT_1wS2UIq79DdzqhWWHUVnnCRwXaZg",
  authDomain: "chophouse-kitchen.firebaseapp.com",
  projectId: "chophouse-kitchen",
  storageBucket: "chophouse-kitchen.firebasestorage.app",
  messagingSenderId: "1062631001533",
  appId: "1:1062631001533:web:beaf47ff0c79f56bd7d6d4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs
};
