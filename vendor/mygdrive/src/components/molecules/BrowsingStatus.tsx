import { Box, Text } from "ink";
import { Spinner } from "../atoms/Spinner.js";
import { StyledText } from "../atoms/StyledText.js";

interface BrowsingStatusProps {
  folderName: string;
  loading: boolean;
  currentId: string;
}

export const BrowsingStatus = ({
  folderName,
  loading,
  currentId,
}: BrowsingStatusProps) => (
  <Box flexDirection="column">
    <Text>Browsing: </Text>
    {loading ? (
      <Spinner color="green">Loading...</Spinner>
    ) : (
      <>
        <StyledText variant="success" bold>
          {folderName}
        </StyledText>
        <Text> </Text>
        <StyledText variant="secondary">({currentId})</StyledText>
      </>
    )}
  </Box>
);
