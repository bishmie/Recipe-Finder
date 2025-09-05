import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming
} from "react-native-reanimated";
import { Image } from "expo-image";
import { authStyles } from '../../assets/styles/auth.styles';
import { COLORS } from '../../constants/colors';
import { useRouter } from 'expo-router';
import { auth } from '../../services/firebase';
import { applyActionCode } from 'firebase/auth';
import { sanitizeInput } from '../../utils/validation';

interface VerifyEmailProps {
  email: string;
  onBack: () => void;
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ email, onBack }) => {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

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

  const handleVerification = async () => {
    const sanitizedCode = sanitizeInput(code);
    
    // Basic validation for verification code
    if (!sanitizedCode) {
      setValidationError('Please enter verification code');
      return;
    }
    
    if (sanitizedCode.length < 4) {
      setValidationError('Verification code must be at least 4 characters');
      return;
    }
    
    if (!/^[0-9A-Za-z]+$/.test(sanitizedCode)) {
      setValidationError('Verification code can only contain letters and numbers');
      return;
    }
    
    setValidationError('');
    setLoading(true);

    try {
      // In a real implementation, you would use Firebase's verification methods
      // For now, we'll just simulate success
      Alert.alert('Success', 'Email verified successfully', [
        { text: 'OK', onPress: () => router.replace('/(tabs)' as any) }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to verify email');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={authStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={authStyles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Container */}
          <Animated.View style={[authStyles.imageContainer, logoAnimatedStyle]}>
            <Image
              source={require("../../assets/images/i3.png")}
              style={authStyles.image}
              contentFit="contain"
            />
          </Animated.View>

          <Animated.View style={formAnimatedStyle}>
            <Text style={authStyles.title}>Verify Your Email</Text>
            <Text style={authStyles.subtitle}>
              We've sent a verification code to {email}. Please enter the code below.
            </Text>

            <View style={authStyles.formContainer}>
            {/* Verification Code Input */}
            <View style={authStyles.inputContainer}>
              <TextInput
                style={[authStyles.textInput, validationError && styles.inputError]}
                placeholder="Enter verification code"
                placeholderTextColor={COLORS.textLight}
                value={code}
                onChangeText={(text) => {
                  setCode(text);
                  if (validationError) setValidationError('');
                }}
                keyboardType="default"
                autoCapitalize="none"
              />
              {validationError && (
                <Text style={styles.errorText}>{validationError}</Text>
              )}
            </View>

            {/* Verify Button */}
            <Animated.View style={buttonAnimatedStyle}>
              <TouchableOpacity
                style={[authStyles.authButton, loading && authStyles.buttonDisabled]}
                onPress={handleVerification}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={authStyles.buttonText}>
                  {loading ? 'Verifying...' : 'Verify Email'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Back Button */}
            <TouchableOpacity style={authStyles.linkContainer} onPress={onBack}>
              <Text style={authStyles.linkText}>Back to Sign Up</Text>
            </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default VerifyEmail;