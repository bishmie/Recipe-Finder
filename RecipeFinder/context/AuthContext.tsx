import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth, signInWithEmail, signUpWithEmail, signOutUser } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { UserService } from '../services/userService';
import { UserProfile, ADMIN_CREDENTIALS } from '../types/user';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, displayName?: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Load user profile
          const profile = await UserService.getUserProfile(currentUser.uid);
          setUserProfile(profile);
          setIsAdmin(profile?.role === 'admin' || currentUser.email === ADMIN_CREDENTIALS.email);
          
          // Update last login time
          if (profile) {
            await UserService.updateUserProfile(currentUser.uid, {
              lastLoginAt: new Date()
            });
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserProfile(null);
          setIsAdmin(false);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const user = await signInWithEmail(email, password);
    return user;
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const user = await signUpWithEmail(email, password);
    
    // Create user profile in Firestore
    try {
      const profile = await UserService.createUserProfile(user, { displayName });
      setUserProfile(profile);
      setIsAdmin(profile.role === 'admin');
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
    
    return user;
  };

  const logout = async () => {
    await signOutUser();
    setUserProfile(null);
    setIsAdmin(false);
  };

  const refreshUserProfile = async () => {
    if (user) {
      try {
        const profile = await UserService.getUserProfile(user.uid);
        setUserProfile(profile);
        setIsAdmin(profile?.role === 'admin' || user.email === ADMIN_CREDENTIALS.email);
      } catch (error) {
        console.error('Error refreshing user profile:', error);
      }
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (user && userProfile) {
      try {
        await UserService.updateUserProfile(user.uid, updates);
        setUserProfile({ ...userProfile, ...updates });
      } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut: logout,
    refreshUserProfile,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};