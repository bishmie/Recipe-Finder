import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace('/(auth)/sign-in');
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !user || !isAdmin) {
    return null; // Don't render anything while checking auth
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="pending-recipes" />


      <Stack.Screen name="recipe-details" />
    </Stack>
  );
}