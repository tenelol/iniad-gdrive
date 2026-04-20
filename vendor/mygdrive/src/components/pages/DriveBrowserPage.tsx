import { Box, Text, useApp } from "ink";
import {
  type ListItem,
  useFileOperations,
} from "../../hooks/useFileOperations.js";
import { useGdriveBrowse } from "../../hooks/useGdriveBrowse.js";
import { useUserAction } from "../../hooks/useUserAction.js";
import { Spinner } from "../atoms/Spinner.js";
import { StyledText } from "../atoms/StyledText.js";
import { Case, Default, DefineCase, Switch } from "../control/Switch.js";
import { BrowsingStatus } from "../molecules/BrowsingStatus.js";
import { StatusMessage } from "../molecules/StatusMessage.js";
import { ActionMenu } from "../organisms/ActionMenu.js";
import { DetailPanel } from "../organisms/DetailPanel.js";
import { FileList } from "../organisms/FileList.js";
import { HistoryTree } from "../organisms/HistoryTree.js";
import { AppLayout, Footer, Header, Main } from "../templates/AppLayout.js";

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

const backItem: ListItem = {
  label: ".. (up)",
  value: {
    id: "BACK",
    original: {
      id: "BACK",
      name: ".. (up)",
      type: "folder",
      size: "",
      created: "",
    },
    isFolder: true,
    isBack: true,
  },
};

export const DriveBrowserPage = ({
  initialFolderId,
}: { initialFolderId?: string }) => {
  const { exit } = useApp();

  const browser = useGdriveBrowse(initialFolderId);
  const operations = useFileOperations();

  // --- Input & Action Handling ---
  const { setHighlightedItem, handleItemSelect, handleActionSelect } =
    useUserAction({
      browser,
      operations,
      exit,
    });

  // --- Data for Rendering ---
  const fileListItems: ListItem[] = [
    backItem,
    ...browser.items.flatMap(browser.generateListItem),
  ];

  // --- Rendering ---
  const error = browser.error || operations.error;
  if (error) {
    return (
      <Box padding={1} borderStyle="round" borderColor="red">
        <Text color="red">Error: {error.type}</Text>
        {error.message && <Text>{error.message}</Text>}
      </Box>
    );
  }

  return (
    <AppLayout>
      <Header>
        <HistoryTree
          history={browser.history}
          currentName={browser.folderName}
          loading={browser.loading}
        />
        <BrowsingStatus
          folderName={browser.folderName}
          loading={browser.loading}
          currentId={browser.currentId}
        />
      </Header>
      <Main>
        <Switch>
          <Case when={browser.loading}>
            <LoadingView />
          </Case>

          <Case when={operations.processing}>
            <ProcessingView
              fileName={operations.activeFile?.value.original.name}
            />
          </Case>

          <DefineCase when={operations.detailedInfo}>
            {(when) => (
              <DetailPanel info={when} onBack={operations.hideFileInfo} />
            )}
          </DefineCase>

          <DefineCase when={operations.activeFile}>
            {(when) => (
              <ActionMenu activeFile={when} onSelect={handleActionSelect} />
            )}
          </DefineCase>

          <Default>
            <FileList
              items={fileListItems}
              onSelect={handleItemSelect}
              onHighlight={setHighlightedItem}
            />
          </Default>
        </Switch>
      </Main>
      <Footer>
        <StatusMessage
          message={operations.statusMessage ?? undefined}
          type="success"
        />
        <Box marginTop={operations.statusMessage ? 1 : 0}>
          <StyledText variant="secondary">
            {operations.detailedInfo
              ? "Press Enter to go back"
              : operations.activeFile
                ? "Select an action"
                : "Use ↑/↓ to move, Enter to select, 'q' to exit"}
          </StyledText>
        </Box>
      </Footer>
    </AppLayout>
  );
};

export default DriveBrowserPage;
