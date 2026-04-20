import { Box } from "ink";
import { StyledText } from "../atoms/StyledText.js";

export const InfoItem = ({
  label,
  value,
}: { label: string; value: string | boolean | string[] }) => {
  const toPascalCase = (str: string) => {
    if (!str) {
      return "";
    }
    const [first, ...rest] = str.split("");
    return `${first.toUpperCase() + rest.join("")}`;
  };

  const formattedValue =
    typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : Array.isArray(value)
        ? value.join(", ")
        : toPascalCase(value);

  return (
    <Box>
      <Box width={15}>
        <StyledText variant="primary">{label}:</StyledText>
      </Box>
      <Box flexGrow={1}>
        <StyledText>{formattedValue}</StyledText>
      </Box>
    </Box>
  );
};
