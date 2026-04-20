import { Box } from "ink";
import type React from "react";
import type { ListItem } from "../../hooks/useFileOperations.js";
import type { GdriveInfo } from "../../types/index.js";
import { Spinner } from "../atoms/Spinner.js";
import { Case, Default, Switch } from "../control/Switch.js";
import { ActionMenu } from "./ActionMenu.js";
import { DetailPanel } from "./DetailPanel.js";
import { FileList } from "./FileList.js";

type DriveContentProps = {
  loading: boolean;
  processing: boolean;
  activeFile: ListItem | null;
  detailedInfo: GdriveInfo | null;
  fileListItems: ListItem[];
  onSelectFile: (item: ListItem) => void;
  onHighlightFile: (item: ListItem | null) => void;
  onActionSelect: (action: { value: string }) => void;
  onBackFromDetail: () => void;
};

const LoadingView = () => (
  <Box borderStyle="single" borderColor="yellow">
    <Spinner color="green">Loading...</Spinner>
  </Box>
);

const ProcessingView = ({ fileName }: { fileName?: string }) => (
  <Box borderStyle="double" borderColor="yellow" padding={1}>
    <Spinner color="yellow">Processing {fileName}...</Spinner>
  </Box>
);

export const DriveContent: React.FC<DriveContentProps> = (props) => {
  const {
    loading,
    processing,
    activeFile,
    detailedInfo,
    fileListItems,
    onSelectFile,
    onHighlightFile,
    onActionSelect,
    onBackFromDetail,
  } = props;

  return (
    <Switch>
      <Case when={loading}>
        <LoadingView />
      </Case>

      <Case when={processing}>
        <ProcessingView fileName={activeFile?.value.original.name} />
      </Case>

      <Case when={!!detailedInfo}>
        {detailedInfo && (
          <DetailPanel info={detailedInfo} onBack={onBackFromDetail} />
        )}
      </Case>

      <Case when={!!activeFile}>
        {activeFile && (
          <ActionMenu activeFile={activeFile} onSelect={onActionSelect} />
        )}
      </Case>

      <Default>
        <FileList
          items={fileListItems}
          onSelect={onSelectFile}
          onHighlight={onHighlightFile}
        />
      </Default>
    </Switch>
  );
};
