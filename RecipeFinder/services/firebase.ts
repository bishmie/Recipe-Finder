import { initializeApp } from 'firebase/app';
import { 
  initializeAuth,
  getAuth,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  TwitterAuthProvider, 
  signOut,
  onAuthStateChanged,
  User, 
  Auth
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';


const firebaseConfig = {

   apiKey: "AIzaSyD0hgZAr6M7YGhz1gUSd6AOtnIGZDPRHr8",
  authDomain: "reactnative-recipefinder.firebaseapp.com",
  projectId: "reactnative-recipefinder",
  storageBucket: "reactnative-recipefinder.firebasestorage.app",
  messagingSenderId: "32337621192",
  appId: "1:32337621192:web:9ad1fd4be8267cd25735fd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with proper configuration for Expo
let auth: Auth;
try {
  // For React Native (Expo), use initializeAuth without custom persistence
  if (Platform.OS !== 'web') {
    auth = initializeAuth(app, {
      // Expo handles persistence automatically
    });
  } else {
    // For web, use standard getAuth
    auth = getAuth(app);
  }
} catch (error: any) {
  // Fallback to default auth if initialization fails
  console.warn('Using default auth initialization:', (error as Error).message);
  auth = getAuth(app);
}

const db = getFirestore(app);

// Initialize providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const twitterProvider = new TwitterAuthProvider();

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw error;
  }
};

// Send email verification
export const sendVerificationEmail = async (user: User): Promise<void> => {
  try {
    await sendEmailVerification(user);
  } catch (error: any) {
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log(userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    throw error;
  }
};

// Sign in with Facebook
export const signInWithFacebook = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    return result.user;
  } catch (error: any) {
    throw error;
  }
};

// Sign in with Twitter
export const signInWithTwitter = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, twitterProvider);
    return result.user;
  } catch (error: any) {
    throw error;
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw error;
  }
};


export { auth, db };