// src/js/auth.js
import { auth, db, googleProvider } from './firebase-config.js';
import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authListeners = [];
    }

    init() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        emailVerified: user.emailVerified
                    };
                    
                    // Create/update user profile in Firestore
                    await this.syncUserProfile(user);
                    
                    // Notify listeners
                    this.notifyListeners(true);
                    resolve(user);
                } else {
                    this.currentUser = null;
                    this.notifyListeners(false);
                    resolve(null);
                }
            });
        });
    }

    // Register new user
    async register(email, password, username) {
        try {
            // Input validation
            if (!this.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }
            if (password.length < 8) {
                throw new Error('Password must be at least 8 characters');
            }
            if (!username || username.length < 3) {
                throw new Error('Username must be at least 3 characters');
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Update profile
            await updateProfile(userCredential.user, {
                displayName: username
            });

            // Create Firestore user document
            await this.createUserProfile(userCredential.user.uid, {
                email: email,
                username: username,
                xp: 0,
                level: 1,
                streak: 0,
                hearts: 5,
                mana: 100,
                badges: [],
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });

            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Login existing user
    async login(email, password) {
        try {
            if (!this.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // Update last login
            await this.updateUserLogin(userCredential.user.uid);
            
            return { success: true, user: userCredential.user };
        } catch (error) {
            let message = 'Login failed';
            if (error.code === 'auth/user-not-found') {
                message = 'No account found with this email';
            } else if (error.code === 'auth/wrong-password') {
                message = 'Incorrect password';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Too many attempts. Please try again later';
            }
            return { success: false, error: message };
        }
    }

    // Google Sign-in
    async signInWithGoogle() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            
            // Check if it's a new user
            const userDoc = await getDoc(doc(db, 'users', result.user.uid));
            
            if (!userDoc.exists()) {
                await this.createUserProfile(result.user.uid, {
                    email: result.user.email,
                    username: result.user.displayName,
                    xp: 0,
                    level: 1,
                    streak: 0,
                    hearts: 5,
                    mana: 100,
                    badges: [],
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });
            } else {
                await this.updateUserLogin(result.user.uid);
            }
            
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Logout
    async logout() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Password reset
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true, message: 'Password reset email sent!' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Helper: Create user profile in Firestore
    async createUserProfile(uid, data) {
        try {
            await setDoc(doc(db, 'users', uid), data, { merge: true });
        } catch (error) {
            console.error('Error creating user profile:', error);
        }
    }

    // Helper: Update last login
    async updateUserLogin(uid) {
        try {
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, {
                lastLogin: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error updating login:', error);
        }
    }

    // Helper: Sync user profile
    async syncUserProfile(user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            await this.createUserProfile(user.uid, {
                email: user.email,
                username: user.displayName || 'Adventurer',
                lastLogin: serverTimestamp()
            });
        }
    }

    // Validation
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Listener system for UI updates
    onAuthChange(callback) {
        this.authListeners.push(callback);
    }

    notifyListeners(isLoggedIn) {
        this.authListeners.forEach(callback => callback(isLoggedIn, this.currentUser));
    }
}

// Create singleton instance
const authManager = new AuthManager();

// Initialize auth listener
authManager.init();

export default authManager;
