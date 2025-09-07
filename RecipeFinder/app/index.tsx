<<<<<<< HEAD

import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import SplashScreen from "@/components/ui/screen/splashScreen";
import { useAuth } from "../hooks/useAuth";

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        if (user) {
          router.replace("/home");
        } else {
          router.replace("/sign-in");
        }
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [loading, user, router]);

  return (
    <View style={styles.container}>
      <SplashScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
=======
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
}
>>>>>>> 3fa1aac7fb24ab97d1b89fb959709588ba045312
