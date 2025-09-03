
import { Text, View, StyleSheet } from "react-native";
import SplashScreen from "@/components/ui/screen/splashScreen";
import SignInScreen from "./(auth)/sign-in";
import SignUpScreen from "./(auth)/sign-up";
import VerifyEmail from "./(auth)/verify-email";

export default function Index() {
  return (
    <View style={styles.container}>
      {/* <SignInScreen/> */}
      {/* <SignUpScreen/> */}
      <VerifyEmail 
        email="example@email.com"
        onBack={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
