import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { GdriveInfo } from "../../types/index.js";
import { Icon } from "../atoms/Icon.js";
import { StyledText } from "../atoms/StyledText.js";
import { InfoItem } from "../molecules/InfoItem.js";

type DetailPanelProps = {
  info: GdriveInfo;
  onBack: () => void;
};

const BackItemComponent = ({ isSelected }: any) => (
  <Box>
    <Text color={isSelected ? "blue" : undefined}>
      {isSelected ? "> " : "  "}
    </Text>
    <Icon type="back" />
    <Text> </Text>
    <StyledText variant={isSelected ? "primary" : undefined}>Back</StyledText>
  </Box>
);

export const DetailPanel = ({ info, onBack }: DetailPanelProps) => {
  return (
    <Box
      borderStyle="double"
      borderColor="blue"
      flexDirection="column"
      padding={1}
    >
      <Box marginBottom={1}>
        <Text bold underline>
          File Details
        </Text>
      </Box>
      {Object.entries(info).map(([key, val]) => (
        <InfoItem key={key} label={key} value={val} />
      ))}
      <Box marginTop={1}>
        <SelectInput
          items={[{ label: "Back", value: "back" }]}
          onSelect={onBack}
          itemComponent={BackItemComponent}
        />
      </Box>
    </Box>
  );
};
