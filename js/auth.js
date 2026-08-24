import { auth, createUserWithEmailAndPassword, doc, setDoc, db } from '../firebase/firebase-config.js';
import { showToast } from './utils.js';

// Register new user
export async function registerUser(email, password, userData) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Save user data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
            email: email,
            fullName: userData.fullName,
            role: userData.role || 'salesman',
            phone: userData.phone || '',
            address: userData.address || '',
            createdAt: new Date().toISOString(),
            isActive: true
        });
        
        showToast('User registered successfully!', 'success');
        return user;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// Check user permissions
export function checkPermission(requiredRole) {
    // Get current user role from auth
    // Implement role-based access control
    return true;
}

// Get current user role
export async function getUserRole(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data().role;
        }
        return null;
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
}