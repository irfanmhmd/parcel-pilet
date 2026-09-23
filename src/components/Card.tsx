import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface CardProps extends ViewProps {
  level?: 0 | 1 | 2;
}

export const Card: React.FC<CardProps> = ({ level = 1, style, children, ...props }) => {
  const getBackgroundColor = () => {
    switch (level) {
      case 0:
        return theme.colors.background;
      case 1:
        return theme.colors.surfaceContainerLow;
      case 2:
        return theme.colors.surfaceContainerHigh;
      default:
        return theme.colors.surfaceContainerLow;
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: getBackgroundColor() },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)', // Subtle inner stroke
  },
});
