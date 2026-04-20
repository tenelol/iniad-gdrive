import { Box, type BoxProps } from "ink";
import type React from "react";

type StyledBoxProps = React.PropsWithChildren<
  BoxProps & {
    variant?:
      | "primary"
      | "secondary"
      | "success"
      | "error"
      | "warning"
      | "info";
  }
>;

const BORDER_COLORS = {
  primary: "cyan",
  secondary: "gray",
  success: "green",
  error: "red",
  warning: "yellow",
  info: "blue",
} as const;

export const StyledBox: React.FC<StyledBoxProps> = ({
  variant = "primary",
  children,
  ...props
}) => {
  const borderColor = BORDER_COLORS[variant] ?? "white";

  return (
    <Box borderColor={borderColor} {...props}>
      {children}
    </Box>
  );
};
