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
import { useState, useEffect } from "react"; 
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
import { validateAuthForm, sanitizeInput } from "../../utils/validation";
import { ADMIN_CREDENTIALS } from "../../types/user";
import CustomAlert from "../../components/ui/CustomAlert";
import { useAlert } from "../../hooks/useAlert";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  runOnJS
} from "react-native-reanimated";

const SignInScreen = () => { 
  const router = useRouter(); 
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [showPassword, setShowPassword] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { alert, visible, showError, showSuccess, hideAlert } = useAlert();

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.5);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Logo animation
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    
    // Form animation with delay
    setTimeout(() => {
      formOpacity.value = withTiming(1, { duration: 500 });
      formTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    }, 300);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [{ scale: logoScale.value }],
    };
  });

  const formAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: formOpacity.value,
      transform: [{ translateY: formTranslateY.value }],
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }; 

  const handleSignIn = async () => { 
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = password; // Don't sanitize password as it may contain special chars

    // Validate form
    const errors = validateAuthForm({
      email: sanitizedEmail,
      password: sanitizedPassword,
      type: 'signin'
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setLoading(true); 

    try { 
      // Sign in with Firebase
      await signInWithEmail(sanitizedEmail, sanitizedPassword);
      
      // Navigate to home screen on successful login
      router.replace("/home");
    } catch (err: any) { 
      showError("Sign In Failed", err.message || "Failed to sign in"); 
      console.error(JSON.stringify(err, null, 2)); 
    } finally { 
      setLoading(false); 
    } 
  };

  const handleAdminLogin = async () => {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = password;

    // Check if credentials match admin credentials
    if (sanitizedEmail !== ADMIN_CREDENTIALS.email || sanitizedPassword !== ADMIN_CREDENTIALS.password) {
      showError(
        "Admin Access Denied", 
        "Invalid admin credentials. Please check your email and password."
      );
      return;
    }

    setLoading(true);

    try {
      // Sign in with Firebase using admin credentials
      await signInWithEmail(sanitizedEmail, sanitizedPassword);
      
      showSuccess("Admin Login Successful", "Welcome to the admin dashboard!");
      
      // Navigate to admin dashboard
      setTimeout(() => {
        router.replace("/dashboard");
      }, 1500);
    } catch (err: any) {
      showError(
        "Admin Login Failed", 
        err.message || "Failed to authenticate admin credentials"
      );
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
          <Animated.View style={[authStyles.imageContainer, logoAnimatedStyle]}> 
            <Image 
              source={require("../../assets/images/i2.png")} 
              style={authStyles.image} 
              contentFit="contain" 
            /> 
          </Animated.View> 

          <Animated.View style={formAnimatedStyle}>
            <Text style={authStyles.title}>Welcome Back</Text> 

            <View style={authStyles.formContainer}> 
            {/* Email Input */} 
            <View style={authStyles.inputContainer}> 
              <TextInput 
                style={[authStyles.textInput, validationErrors.email && styles.inputError]} 
                placeholder="Enter email" 
                placeholderTextColor={COLORS.textLight} 
                value={email} 
                onChangeText={setEmail} 
                keyboardType="email-address" 
                autoCapitalize="none" 
              /> 
              {validationErrors.email && (
                <Text style={styles.errorText}>{validationErrors.email}</Text>
              )}
            </View> 

            {/* Password Input */} 
            <View style={authStyles.inputContainer}> 
              <TextInput 
                style={[authStyles.textInput, validationErrors.password && styles.inputError]} 
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
              {validationErrors.password && (
                <Text style={styles.errorText}>{validationErrors.password}</Text>
              )}
            </View> 

            {/* Sign In Button */} 
            <Animated.View style={buttonAnimatedStyle}>
              <TouchableOpacity 
                style={[authStyles.authButton, loading && authStyles.buttonDisabled]} 
                onPress={handleSignIn} 
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={loading} 
                activeOpacity={1} 
              > 
                <Text style={authStyles.buttonText}> 
                  {loading ? "Signing In..." : "Sign In"} 
                </Text> 
              </TouchableOpacity>
            </Animated.View>

            {/* Admin Login Button */}
            <Animated.View style={buttonAnimatedStyle}>
              <TouchableOpacity 
                style={[styles.adminButton, loading && authStyles.buttonDisabled]} 
                onPress={handleAdminLogin} 
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={loading} 
                activeOpacity={1} 
              > 
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.white} style={styles.adminIcon} />
                <Text style={styles.adminButtonText}> 
                  {loading ? "Authenticating..." : "Login as Admin"} 
                </Text> 
              </TouchableOpacity>
            </Animated.View>

            {/* Social Media Login Options */}
            <View style={styles.socialContainer}>
              <Text style={styles.orText}>OR</Text>
              <View style={styles.socialButtonsRow}>
                <TouchableOpacity 
                  style={styles.socialButton} 
                  onPress={async () => {
                    try {
                      await signInWithGoogle();
                      router.replace("/home");
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
                      router.replace("/home");
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
                      router.replace("/home");
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
          </Animated.View> 
        </ScrollView> 
      </KeyboardAvoidingView> 
      
      {/* Custom Alert */}
      <CustomAlert
        visible={visible}
        type={alert?.type || 'info'}
        title={alert?.title || ''}
        message={alert?.message || ''}
        onClose={hideAlert}
        duration={alert?.duration}
      />
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
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  adminButton: {
    backgroundColor: '#6B46C1',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    flexDirection: 'row',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  adminButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  adminIcon: {
    marginRight: 4,
  },
});

export default SignInScreen;