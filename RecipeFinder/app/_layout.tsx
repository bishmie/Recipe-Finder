import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';
import { View } from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    // Show splash screen initially
    const timer = setTimeout(() => {
      if (user) {
        // User is authenticated, navigate to tabs
        setInitialRoute('(tabs)');
      } else {
        // User is not authenticated, navigate to auth
        setInitialRoute('(auth)/sign-in');
      }
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(timer);
  }, [user]);

  if (loading || !initialRoute) {
    // Show loading spinner while checking auth state
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
