import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth, signInWithEmail, signUpWithEmail, signOutUser } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ADMIN_CREDENTIALS } from '../types/user';
import { NotificationService } from '../services/notificationService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, displayName?: string) => Promise<User>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Simple admin check based on email
        setIsAdmin(currentUser.email === ADMIN_CREDENTIALS.email);
        
        // Register notification token for authenticated user
        try {
          const token = await NotificationService.registerForPushNotifications();
          if (token) {
            await NotificationService.storeNotificationToken(token);
          }
        } catch (error) {
          console.warn('Failed to register notification token:', error);
        }
      } else {
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
    return user;
  };

  const signOut = async () => {
    // Clean up notification token before signing out
    if (user) {
      try {
        await NotificationService.unregisterUserToken(user.uid);
      } catch (error) {
        console.warn('Failed to unregister notification token:', error);
      }
    }
    
    await signOutUser();
  };

  const value = {
    user,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};