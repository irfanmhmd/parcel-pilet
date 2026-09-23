import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface TypographyProps extends TextProps {
  variant?: keyof typeof theme.typography;
  color?: string;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'bodyMd',
  color = theme.colors.onSurface,
  style,
  children,
  ...props
}) => {
  const variantStyle = theme.typography[variant];

  return (
    <Text
      style={[
        variantStyle,
        { color },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};
