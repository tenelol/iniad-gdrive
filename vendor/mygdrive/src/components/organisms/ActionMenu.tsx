import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { ListItem } from "../../hooks/useFileOperations.js";
import { Icon, type IconType } from "../atoms/Icon.js";
import { StyledText } from "../atoms/StyledText.js";

type ActionMenuProps = {
  activeFile: ListItem;
  onSelect: (action: { value: string }) => void;
};

const actionItems = [
  { label: "Back", value: "back", icon: "back" as IconType },
  { label: "Download", value: "download", icon: "download" as IconType },
  { label: "Info", value: "info", icon: "info" as IconType },
];

const ItemComponent = ({ label, isSelected, icon }: any) => {
  return (
    <Box>
      <Text color={isSelected ? "blue" : undefined}>
        {isSelected ? "> " : "  "}
      </Text>
      <Icon type={icon} />
      <Text> </Text>
      <StyledText variant={isSelected ? "primary" : undefined}>
        {label}
      </StyledText>
    </Box>
  );
};

export const ActionMenu = ({ activeFile, onSelect }: ActionMenuProps) => {
  return (
    <Box
      borderStyle="double"
      borderColor="green"
      flexDirection="column"
      padding={1}
    >
      <Text bold underline>
        Selected: {activeFile.value.original.name}
      </Text>
      <Text color="gray">ID: {activeFile.value.id}</Text>
      <SelectInput
        items={actionItems}
        onSelect={onSelect}
        itemComponent={ItemComponent}
      />
    </Box>
  );
};
