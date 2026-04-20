import { type Key, useInput } from "ink";
import { useState } from "react";
import type { ListItem, useFileOperations } from "./useFileOperations.js";
import type { useGdriveBrowse } from "./useGdriveBrowse.js";

interface UseUserActionProps {
  browser: ReturnType<typeof useGdriveBrowse>;
  operations: ReturnType<typeof useFileOperations>;
  exit: () => void;
}

export const useUserAction = ({
  browser,
  operations,
  exit,
}: UseUserActionProps) => {
  const [highlightedItem, setHighlightedItem] = useState<ListItem | null>(null);

  const handleItemSelect = (item: ListItem | null) => {
    if (!item) {
      return;
    }
    setHighlightedItem(null);
    if (item.value.isBack) {
      browser.goToParent();
      return;
    }

    if (item.value.isFolder) {
      browser.enterFolder(item.value.id);
    } else {
      operations.selectFile(item);
    }
  };

  const handleActionSelect = async (action: { value: string }) => {
    if (action.value === "back") {
      operations.clearFileSelection();
      return;
    }
    if (action.value === "download") {
      await operations.downloadActiveFile();
    }
    if (action.value === "info") {
      await operations.fetchAndShowFileInfo();
    }
  };

  const isGoToParentWithLeftArrow =
    highlightedItem?.value.isFolder || highlightedItem?.value.isBack;

  const keyInputHandler = (input: string, key: Key) => {
    if (key.leftArrow) {
      return "leftArrow";
    }
    if (key.rightArrow) {
      return "rightArrow";
    }

    return input;
  };

  useInput((input, key) => {
    if (operations.isBusy) {
      return;
    }
    switch (keyInputHandler(input, key)) {
      case "q": {
        exit();
        break;
      }
      case "leftArrow": {
        operations.clearFileSelection();
        if (isGoToParentWithLeftArrow) {
          browser.goToParent();
        }
        break;
      }
      case "rightArrow": {
        handleItemSelect(highlightedItem);
        break;
      }
    }
  });

  return {
    highlightedItem,
    setHighlightedItem,
    handleItemSelect,
    handleActionSelect,
  };
};
