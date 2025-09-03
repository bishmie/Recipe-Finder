import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="splashScreen" options={{ headerShown: false }} />
    </Stack>
  );
}
