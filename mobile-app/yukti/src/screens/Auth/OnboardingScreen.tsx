// src/screens/Onboarding/OnboardingScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { HorizontalLogo } from '../../components/SVGAssets';

const { width } = Dimensions.get('window');


interface OnboardingSlide {
  illustration: ImageSourcePropType;
  quote: string;
}

const onboardingData: OnboardingSlide[] = [
  {
    illustration: require('../../../assets/images/splash-image-1.png'),
    quote: 'Opinions have odds — make yours count.',
  },
  {
    illustration: require('../../../assets/images/splash-image-2.png'),
    quote: 'Predict. Compete. Profit from perspective.',
  },
  {
    illustration: require('../../../assets/images/splash-image-3.png'),
    quote: 'Every opinion has value — put yours to work.',
  },
];

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out and scale down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Change content
        setCurrentIndex((prev) => (prev + 1) % onboardingData.length);
        // Fade in and scale up
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [fadeAnim, scaleAnim]);

  const handleGetStarted = () => {
    navigation.navigate('Login' as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <HorizontalLogo width={width * 0.5} height={(width * 0.5) * (98 / 274)} />
      </View>

      {/* Main Content with Fade and Scale Animation */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
        {/* SVG Illustration */}
        <View style={styles.imageContainer}>
          <Image source={onboardingData[currentIndex].illustration} style={styles.image} />
        </View>

        {/* Quote */}
        <Text style={styles.quote}>{onboardingData[currentIndex].quote}</Text>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
                index === currentIndex && {
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}>
          <Text style={styles.getStartedText}>Get Started with us</Text>
          <View style={styles.arrowCircle}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.copyright}>Opinion Trade 2025. All Rights Reserved</Text>
        <TouchableOpacity>
          <Text style={styles.terms}>Terms & Conditions *</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1913',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: width * 0.7,
    height: width * 0.6 * 0.95,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  quote: {
    fontSize: 24,
    fontWeight: '400',
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'AbrilFatface_400Regular',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 32,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: '#179E66',
    width: 24,
  },
  inactiveDot: {
    backgroundColor: '#474747',
    width: 8,
  },
  bottomSection: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  getStartedButton: {
    width: width * 0.9,
    height: 64,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 30,
    shadowColor: '#179E66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 18,
    borderWidth: 3.5,
    borderColor: 'rgba(251, 242, 242, 0.30)',
    backgroundColor: 'linear-gradient(90deg,rgba(18, 63, 26, 0.14) 14.44%, #18B420 118.03%)',
    boxShadow: '0 8.7px 13px 0 rgba(255, 255, 255, .2) inset, 0 -8.7px 8.7px 0 rgba(48, 83, 27, 0.5) inset, 0 50px 30px 0 rgba(77, 229, 130, .07)',
    
  },
  getStartedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 242, 242, 0.30)',
    backgroundColor: 'linear-gradient(90deg,rgba(18, 63, 26, 0.14) 14.44%, #18B420 118.03%)',
    boxShadow: '0 8.7px 13px 0 rgba(255, 255, 255, .2) inset, 0 -8.7px 8.7px 0 rgba(48, 83, 27, 0.5) inset, 0 50px 30px 0 rgba(77, 229, 130, .07)',
  },
  arrow: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  copyright: {
    color: '#a0a0a0',
    fontSize: 12,
    marginBottom: 8,
  },
  terms: {
    color: '#a0a0a0',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});

export default OnboardingScreen;