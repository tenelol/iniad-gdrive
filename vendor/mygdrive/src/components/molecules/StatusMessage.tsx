import type React from "react";
import { StyledBox } from "../atoms/StyledBox.js";
import { StyledText } from "../atoms/StyledText.js";

type StatusMessageProps = {
  message?: string;
  type?: "success" | "error" | "info";
};

export const StatusMessage: React.FC<StatusMessageProps> = ({
  message,
  type = "info",
}) => {
  if (!message) {
    return null;
  }

  const variant = type === "info" ? "primary" : type;

  return (
    <StyledBox variant={variant} borderStyle="single">
      <StyledText variant={variant}>{message}</StyledText>
    </StyledBox>
  );
};
