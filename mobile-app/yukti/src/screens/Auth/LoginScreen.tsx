import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput as RNTextInput,
  Image,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { loginUser } from '@/src/store/slices/authSlice';
import { RootState, AppDispatch } from '@/src/store/store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await dispatch(loginUser({ email: formData.email, password: formData.password })).unwrap();
    } catch (err) {
      Alert.alert('Login Failed', 'Invalid credentials');
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert(`${provider} Login`, 'Social login coming soon!');
  };

  // Small Logo Component
  const SmallLogo = () => (
    <View style={styles.smallLogoWrapper}>
      <LinearGradient
        colors={['#8EF55A', '#214A50']}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.smallLogoGradient}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Top Logo */}
        <View style={styles.topLogoContainer}>
          <Image
            source={require('../../../assets/images/VerticalLogo.png')}
            style={{ width: 150, height: 200 }}
            resizeMode="contain"
          />
        </View>

        {/* White Content Card */}
        <View style={styles.card}>
          {/* Small Logo Icon */}
          <View style={styles.cardLogoContainer}>
            <Image
              source={require('../../../assets/images/IconLogo.png')}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.cardTitle}>Get Started</Text>

          {/* Social Login Buttons */}
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Google')}
              activeOpacity={0.85}>
              <LinearGradient
                colors={['#30C285', '#458851']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.socialGradient}>
                <Icon name="google" size={20} color="#fff" />
                <Text style={styles.socialButtonText}>Google</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Github')}
              activeOpacity={0.85}>
              <LinearGradient
                colors={['#30C285', '#458851']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.socialGradient}>
                <Icon name="github" size={20} color="#fff" />
                <Text style={styles.socialButtonText}>Github</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Input Fields */}
          <View style={styles.inputContainer}>
            {/* <View style={styles.inputWrapper}>
              <RNTextInput
                value={formData.username}
                onChangeText={(text) => handleInputChange('username', text)}
                placeholder="Username"
                placeholderTextColor="#818181"
                autoCapitalize="none"
                style={styles.input}
              />
            </View> */}

            <View style={styles.inputWrapper}>
              <RNTextInput
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholder="Email"
                placeholderTextColor="#818181"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
              />
            </View>

            <View style={styles.inputWrapper}>
              <RNTextInput
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                placeholder="Password"
                placeholderTextColor="#818181"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, styles.passwordInput]}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}>
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#818181"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Get Started Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.9}>
            <LinearGradient
              colors={['#30C285', '#458851']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}>
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Signing in...' : 'Get Started →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer Text */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
             Don't have an account?{' '}
              <Text
                style={styles.footerLink}
                onPress={() => navigation.navigate('Register' as never)}>
                Register
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#061510',
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 0,
    justifyContent: 'space-between',
  },
  topLogoContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
    width: '98%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  cardLogoContainer: {
    marginBottom: 16,
  },
  smallLogoWrapper: {
    width: 40,
    height: 40,
    overflow: 'hidden',
  },
  smallLogoGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    transform: [{ scaleX: 1.4 }, { rotate: '25deg' }],
  },
  cardTitle: {
    fontSize: 36,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 24,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
    }),
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#4D85E5',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
  },
  socialGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 18,
    borderWidth: 3.5,
    borderColor: 'rgba(251, 242, 242, 0.60)',
    backgroundColor: 'linear-gradient(90deg,rgba(18, 63, 26, 0.14) 14.44%, #18B420 118.03%)',
    boxShadow: '0 8.7px 13px 0 rgba(255, 255, 255, .2) inset, 0 -8.7px 8.7px 0 rgba(48, 83, 27, 0.5) inset, 0 50px 30px 0 rgba(77, 229, 130, .07)',
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
    gap: 10,
  },
  inputWrapper: {
   
    position: 'relative',
    borderWidth: 1,
    borderColor: '#818181',
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal:12,
  },
  input: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    height: 52,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  submitButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#4D85E5',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,

  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 8,
    borderRadius: 18,
    borderWidth: 3.5,
    borderColor: 'rgba(251, 242, 242, 0.60)',
    backgroundColor: 'linear-gradient(90deg, #0E551B 14.44%, #18B420 118.03%)',
    boxShadow: '0 8.7px 13px 0 rgba(255, 255, 255, 0.54) inset, 0 -8.7px 8.7px 0 rgba(55, 159, 220, 0.50) inset, 0 50px 30px 0 rgba(77, 229, 130, 0.12)',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 40,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#8C8C8C',
    fontWeight: '600',
  },
  footerLink: {
    color: '#30C285',
    fontWeight: '600',
  },
});