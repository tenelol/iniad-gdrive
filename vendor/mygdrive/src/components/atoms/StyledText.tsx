import { Text, type TextProps } from "ink";
import type React from "react";

type StyledTextProps = TextProps & {
  variant?: "primary" | "secondary" | "success" | "error" | "warning";
};

const VARIANTS = {
  primary: "cyan",
  secondary: "gray",
  success: "green",
  error: "red",
  warning: "yellow",
} as const;

export const StyledText: React.FC<StyledTextProps> = ({
  variant = "primary",
  children,
  ...props
}) => {
  const color = VARIANTS[variant] ?? "white";
  return (
    <Text color={color} {...props}>
      {children}
    </Text>
  );
};
