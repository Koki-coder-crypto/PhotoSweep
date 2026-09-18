import React from 'react';
import { Image } from 'expo-image';

/** Decorative beside the app name; matches the iPhone home-screen icon. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return <Image source={require('../../assets/icon.png')} accessible={false}
    style={{ width: size, height: size, borderRadius: size * 0.23 }} contentFit="contain" />;
}
