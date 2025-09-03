
import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import SplashScreen from "@/components/ui/screen/splashScreen";
import { useAuth } from "../hooks/useAuth";

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for splash screen animation to complete
    const timer = setTimeout(() => {
      if (!loading) {
        if (user) {
          // User is authenticated, navigate to tabs
          router.replace("/(tabs)" as any);
        } else {
          // User is not authenticated, navigate to sign in
          router.replace("/(auth)/sign-in" as any);
        }
      }
    }, 2500); // Match the splash screen animation duration

    return () => clearTimeout(timer);
  }, [loading, user, router]);

  // Show splash screen initially
  return (
    <View style={styles.container}>
      <SplashScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
