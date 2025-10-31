// src/screens/Auth/RegisterScreen.tsx
import { registerUser } from '@/src/store/slices/authSlice';
import { AppDispatch, RootState } from '@/src/store/store';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { shadow, Text, TextInput } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, G, Ellipse, Filter, FeFlood, FeBlend, FeGaussianBlur, RadialGradient, Rect } from 'react-native-svg';
import { Image } from 'react-native';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { fullName, email, phone, password } = formData;

    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }

    if (!/^[0-9]{10}$/.test(phone.replace(/\D/g, ''))) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return false;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      const { fullName, email, phone, password } = formData;
      await dispatch(registerUser({ fullName, email, phone, password })).unwrap();
      
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully! Please check your phone for OTP verification.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login' as never),
          },
        ]
      );
    } catch (err) {
      console.log('Registration Failed', err);
      Alert.alert('Registration Failed', error || 'Something went wrong');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient Decorations */}
      <View style={styles.gradientContainer}>
  <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
    <Defs>
      <RadialGradient
        id="radialGrad"
        cx="50%" cy="50%" r="70%"
        fx="50%" fy="50%"
      >
        <Stop offset="0%" stopColor="#5FFFA7" stopOpacity="0.20" />
        <Stop offset="60%" stopColor="#0A2B25" stopOpacity="0.90" />
        <Stop offset="100%" stopColor="#061510" stopOpacity="1" />
      </RadialGradient>
    </Defs>
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#radialGrad)" />
  </Svg>
</View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        
        <View style={styles.logoContainer}>
     <Image
       source={require('../../../assets/images/VerticalLogo.png')}
       style={{ width: 150, height: 200 }}
       resizeMode="contain"
     />
   </View>

        {/* Form Card */}
        <View style={styles.formCard}>
      
          {/* Title */}
          <Text style={styles.title}>Get Started</Text>

          {/* Input Fields */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#818181"
                value={formData.fullName}
                onChangeText={(text) => handleInputChange('fullName', text)}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="#000000"
              />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#818181"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="#000000"
              />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Phone"
                placeholderTextColor="#818181"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="#000000"
              />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#818181"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="#000000"
                right={
                  <TextInput.Icon 
                    icon={showPassword ? "eye-off" : "eye"} 
                    onPress={() => setShowPassword(!showPassword)}
                    color="#818181"
                  />
                }
              />
            </View>
          </View>

          {/* Error Message */}
          {error && <Text style={styles.error}>{error}</Text>}

          {/* Register Button */}
          <TouchableOpacity 
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.9}>
            <LinearGradient
              colors={['#30C285', '#458851']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.registerButton}>
              <Text style={styles.registerButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
              <Text style={[styles.loginLink, { textDecorationColor: '#30C285' }]}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: '#061510',},
  gradientContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: '100%',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
    marginTop: 40,
  },
  logo: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    transform: [{ scaleX: 1.4 }, { rotate: '25deg' }],
  },
  brandText: {
    fontSize: 80,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: -4,
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
    }),
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
    width: 380,
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
    }),
    letterSpacing: -1,
  },
  inputContainer: {
    marginBottom: 20,
    gap: 10,
    width: '100%',
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#818181',
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal:12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 0,
    height: 52,
  },
  registerButton: {
    borderRadius: 18,
    paddingVertical: 6,
    alignItems: 'center',
    
borderWidth: 3.5,
borderColor: 'rgba(251, 242, 242, 0.60)',
backgroundColor: 'linear-gradient(90deg,rgba(18, 63, 26, 0.14) 14.44%, #18B420 118.03%)',
    boxShadow: '0 8.7px 13px 0 rgba(255, 255, 255, .2) inset, 0 -8.7px 8.7px 0 rgba(48, 83, 27, 0.5) inset, 0 50px 30px 0 rgba(77, 229, 130, .07)',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 40,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#8C8C8C',
    fontWeight: '600',
    textDecorationColor:'underline',
    
  },
  loginLink: {
    fontSize: 14,
    color: '#30C285',
    fontWeight: '600',
    textDecorationColor:'underline',
  },
  error: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
});