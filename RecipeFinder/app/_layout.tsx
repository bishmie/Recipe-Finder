
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { NotificationService } from '../services/notificationService';

export default function RootLayout() {
  useEffect(() => {
    // Initialize notifications when app starts
    const initializeNotifications = async () => {
      try {
        await NotificationService.initializeNotifications();
      } catch (error) {
        console.warn('Failed to initialize notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}