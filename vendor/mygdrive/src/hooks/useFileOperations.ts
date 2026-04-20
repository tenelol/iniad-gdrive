import { useState } from "react";
import { downloadFile, getInfo } from "../services/gdrive/index.js";
import type { AppError, GdriveInfo, GdriveItem } from "../types/index.js";

export interface ListItem {
  label: string;
  value: {
    id: string;
    original: GdriveItem;
    isFolder: boolean;
    isBack?: boolean;
  };
}

export const useFileOperations = () => {
  const [activeFile, setActiveFile] = useState<ListItem | null>(null);
  const [processing, setProcessing] = useState(false);
  const [detailedInfo, setDetailedInfo] = useState<GdriveInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const selectFile = (file: ListItem) => {
    setActiveFile(file);
    setStatusMessage(null);
    setDetailedInfo(null);
  };

  const clearFileSelection = () => {
    setActiveFile(null);
  };

  const downloadActiveFile = async () => {
    if (!activeFile) {
      return;
    }

    setProcessing(true);
    const result = await downloadFile(activeFile.value.id);
    setProcessing(false);

    if (result.success) {
      setStatusMessage(
        `Successfully downloaded: ${activeFile.value.original.name}`,
      );
      setActiveFile(null);
    } else {
      setError(result.error);
    }
  };

  const fetchAndShowFileInfo = async () => {
    if (!activeFile) {
      return;
    }

    setProcessing(true);
    const result = await getInfo(activeFile.value.id);
    setProcessing(false);

    if (result.success) {
      setDetailedInfo(result.data);
    } else {
      setError(result.error);
    }
  };

  const hideFileInfo = () => {
    setDetailedInfo(null);
  };

  const isBusy = processing || detailedInfo !== null;

  return {
    activeFile,
    processing,
    detailedInfo,
    statusMessage,
    error,
    isBusy,
    selectFile,
    clearFileSelection,
    downloadActiveFile,
    fetchAndShowFileInfo,
    hideFileInfo,
    setError,
    setStatusMessage,
  };
};
