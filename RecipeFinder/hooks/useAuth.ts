import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook for Firebase authentication
 * Provides the current user, loading state, and auth methods
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};