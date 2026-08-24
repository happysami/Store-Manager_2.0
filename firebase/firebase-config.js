// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    addDoc,
    onSnapshot,
    serverTimestamp,
    increment,
    runTransaction,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Your Firebase config - Replace with your own
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB4ZiEtAiiGmB2mlhOq7B4b10qvNlPWa_o",
  authDomain: "store-management-system-abd6a.firebaseapp.com",
  projectId: "store-management-system-abd6a",
  storageBucket: "store-management-system-abd6a.firebasestorage.app",
  messagingSenderId: "754666871710",
  appId: "1:754666871710:web:537802e8694005ed01d48f",
  measurementId: "G-Y593LZ9LKG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
    auth,
    db,
    storage,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    addDoc,
    onSnapshot,
    serverTimestamp,
    increment,
    runTransaction,
    writeBatch,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
};