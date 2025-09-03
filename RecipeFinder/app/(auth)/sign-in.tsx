import { 
  View, 
  Text, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
} from "react-native"; 
import { useRouter } from "expo-router"; 
import { useState } from "react"; 
import { authStyles } from "../../assets/styles/auth.styles"; 
import { Image } from "expo-image"; 
import { COLORS } from "../../constants/colors"; 
import { Ionicons, FontAwesome } from "@expo/vector-icons"; 
import { 
  signInWithEmail,
  signInWithGoogle,
  signInWithFacebook,
  signInWithTwitter 
} from "../../services/firebase";

const SignInScreen = () => { 
  const router = useRouter(); 
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [showPassword, setShowPassword] = useState(false); 
  const [loading, setLoading] = useState(false); 

  const handleSignIn = async () => { 
    if (!email || !password) return Alert.alert("Error", "Please fill in all fields"); 

    setLoading(true); 

    try { 
      // Sign in with Firebase
      await signInWithEmail(email, password);
      
      // Navigate to home screen on successful login
      router.replace("/(tabs)" as any);
    } catch (err: any) { 
      Alert.alert("Error", err.message || "Failed to sign in"); 
      console.error(JSON.stringify(err, null, 2)); 
    } finally { 
      setLoading(false); 
    } 
  }; 

  return ( 
    <View style={authStyles.container}> 
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} 
        style={authStyles.keyboardView} 
      > 
        <ScrollView 
          contentContainerStyle={authStyles.scrollContent} 
          showsVerticalScrollIndicator={false} 
        > 
          {/* Image Container */} 
          <View style={authStyles.imageContainer}> 
            <Image 
              source={require("../../assets/images/i2.png")} 
              style={authStyles.image} 
              contentFit="contain" 
            /> 
          </View> 

          <Text style={authStyles.title}>Welcome Back</Text> 

          <View style={authStyles.formContainer}> 
            {/* Email Input */} 
            <View style={authStyles.inputContainer}> 
              <TextInput 
                style={authStyles.textInput} 
                placeholder="Enter email" 
                placeholderTextColor={COLORS.textLight} 
                value={email} 
                onChangeText={setEmail} 
                keyboardType="email-address" 
                autoCapitalize="none" 
              /> 
            </View> 

            {/* Password Input */} 
            <View style={authStyles.inputContainer}> 
              <TextInput 
                style={authStyles.textInput} 
                placeholder="Enter password" 
                placeholderTextColor={COLORS.textLight} 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry={!showPassword} 
                autoCapitalize="none" 
              /> 
              <TouchableOpacity 
                style={authStyles.eyeButton} 
                onPress={() => setShowPassword(!showPassword)} 
              > 
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color={COLORS.textLight} 
                /> 
              </TouchableOpacity> 
            </View> 

            {/* Sign In Button */} 
            <TouchableOpacity 
              style={[authStyles.authButton, loading && authStyles.buttonDisabled]} 
              onPress={handleSignIn} 
              disabled={loading} 
              activeOpacity={0.8} 
            > 
              <Text style={authStyles.buttonText}> 
                {loading ? "Signing In..." : "Sign In"} 
              </Text> 
            </TouchableOpacity> 

            {/* Social Media Login Options */}
            <View style={styles.socialContainer}>
              <Text style={styles.orText}>OR</Text>
              <View style={styles.socialButtonsRow}>
                <TouchableOpacity 
                  style={styles.socialButton} 
                  onPress={async () => {
                    try {
                      await signInWithGoogle();
                      router.replace('/(tabs)' as any);
                    } catch (error: any) {
                      Alert.alert('Error', error.message);
                    }
                  }}
                >
                  <FontAwesome name="google" size={24} color="#DB4437" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={async () => {
                    try {
                      await signInWithFacebook();
                      router.replace('/(tabs)' as any);
                    } catch (error: any) {
                      Alert.alert('Error', error.message);
                    }
                  }}
                >
                  <FontAwesome name="facebook" size={24} color="#4267B2" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={async () => {
                    try {
                      await signInWithTwitter();
                      router.replace('/(tabs)' as any);
                    } catch (error: any) {
                      Alert.alert('Error', error.message);
                    }
                  }}
                >
                  <FontAwesome name="twitter" size={24} color="#1DA1F2" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Link */} 
            <TouchableOpacity 
              style={authStyles.linkContainer} 
              onPress={() => router.push("/(auth)/sign-up" as any)} 
            > 
              <Text style={authStyles.linkText}> 
                Don't have an account? <Text style={authStyles.link}>Sign Up</Text> 
              </Text> 
            </TouchableOpacity> 
          </View> 
        </ScrollView> 
      </KeyboardAvoidingView> 
    </View> 
  ); 
}; 

const styles = StyleSheet.create({
  socialContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%'
  },
  orText: {
    color: COLORS.textLight,
    marginVertical: 10,
    fontSize: 14
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  }
});

export default SignInScreen;