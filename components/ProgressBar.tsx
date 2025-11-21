import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color = '#1f3c88',
  backgroundColor = '#e5e5e7',
  height = 6,
  style,
}: ProgressBarProps) {
  return (
    <View style={[styles.container, { backgroundColor, height }, style]}>
      <View
        style={[
          styles.progress,
          {
            width: `${Math.min(Math.max(progress * 100, 0), 100)}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 3,
    overflow: 'hidden',
  },
  progress: {
    borderRadius: 3,
  },
});