<<<<<<< HEAD
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
=======
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack />;
>>>>>>> 3fa1aac7fb24ab97d1b89fb959709588ba045312
}
