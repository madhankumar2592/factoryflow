import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '../constants/theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  optional?: boolean;
}

export function FormField({ label, optional, style, ...props }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {optional && <Text style={styles.optional}> (optional)</Text>}
      </Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={theme.colors.textTertiary}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optional: {
    fontWeight: theme.fontWeight.regular,
    textTransform: 'none',
    letterSpacing: 0,
  },
  input: {
    height: 52,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
