import { Box } from "ink";
import { Breadcrumb } from "../molecules/Breadcrumb.js";

type HistoryTreeProps = {
  history: { id: string; name: string }[];
  currentName: string;
  loading: boolean;
};

export const HistoryTree = ({
  history,
  currentName,
  loading,
}: HistoryTreeProps) => {
  const fullPath = [...history, { name: currentName, id: "current" }];

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Breadcrumb path={fullPath} loading={loading} />
    </Box>
  );
};
