import React, { useState } from 'react';
import { Image, View, Text, StyleSheet, ImageProps, ImageStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageWithFallbackProps extends ImageProps {
  fallbackSrc?: string;
  containerStyle?: ViewStyle;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  source,
  fallbackSrc,
  style,
  containerStyle,
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <View style={[styles.fallbackContainer, containerStyle]}>
        <Ionicons name="image-outline" size={40} color="#ccc" />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={[style, isLoading && styles.loading]}
      onError={handleError}
      onLoad={handleLoad}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    opacity: 0.5,
  },
});

export default ImageWithFallback;

