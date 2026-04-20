import { Box, Text } from "ink";
import type React from "react";
import { Spinner } from "../atoms/Spinner.js";
import { StyledText } from "../atoms/StyledText.js";

type BreadcrumbProps = {
  path: { id: string; name: string }[];
  loading?: boolean;
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, loading }) => {
  return (
    <Box flexDirection="column">
      {path.map((folder, index) => {
        const isLast = index === path.length - 1;
        return (
          <Box key={folder.id} marginLeft={index * 2}>
            <Text>└─ </Text>
            {loading && isLast ? (
              <Spinner />
            ) : (
              <>
                <Text>📂 </Text>
                <StyledText>{folder.name}</StyledText>
              </>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
