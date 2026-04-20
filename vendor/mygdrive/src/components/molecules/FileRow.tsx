import { Box, Text } from "ink";
import type React from "react";
import type { GdriveItem } from "../../types/index.js";
import { Icon, type IconType } from "../atoms/Icon.js";
import { StyledText } from "../atoms/StyledText.js";

type FileRowProps = {
  item: GdriveItem;
  isSelected: boolean;
  iconType?: IconType;
};

export const FileRow: React.FC<FileRowProps> = ({
  item,
  isSelected,
  iconType,
}) => {
  const type = iconType ?? (item.type === "folder" ? "folder" : "file");
  return (
    <Box>
      <Text color={isSelected ? "blue" : undefined}>
        {isSelected ? "> " : "  "}
      </Text>
      <Icon type={type} />
      <Text> </Text>
      <StyledText variant={isSelected ? "primary" : undefined}>
        {item.name}
      </StyledText>
      <Box marginLeft={2}>
        <StyledText variant="secondary">{item.size}</StyledText>
      </Box>
    </Box>
  );
};
