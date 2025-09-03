import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Image } from "expo-image";
import { authStyles } from '../../assets/styles/auth.styles';
import { COLORS } from '../../constants/colors';
import { useRouter } from 'expo-router';
import { auth } from '../../services/firebase';
import { applyActionCode } from 'firebase/auth';

interface VerifyEmailProps {
  email: string;
  onBack: () => void;
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ email, onBack }) => {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerification = async () => {
    if (!code) return Alert.alert('Error', 'Please enter verification code');

    setLoading(true);

    try {
      // In a real implementation, you would use Firebase's verification methods
      // For now, we'll just simulate success
      Alert.alert('Success', 'Email verified successfully', [
        { text: 'OK', onPress: () => router.replace('/') }
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
          <View style={authStyles.imageContainer}>
            <Image
              source={require("../../assets/images/i3.png")}
              style={authStyles.image}
              contentFit="contain"
            />
          </View>

          <Text style={authStyles.title}>Verify Your Email</Text>
          <Text style={authStyles.subtitle}>
            We've sent a verification code to {email}. Please enter the code below.
          </Text>

          <View style={authStyles.formContainer}>
            {/* Verification Code Input */}
            <View style={authStyles.inputContainer}>
              <TextInput
                style={authStyles.textInput}
                placeholder="Enter verification code"
                placeholderTextColor={COLORS.textLight}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[authStyles.authButton, loading && authStyles.buttonDisabled]}
              onPress={handleVerification}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={authStyles.buttonText}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </Text>
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity style={authStyles.linkContainer} onPress={onBack}>
              <Text style={authStyles.linkText}>Back to Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default VerifyEmail;