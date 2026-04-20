import { useCallback, useEffect, useState } from "react";
import { getInfo, getItems } from "../services/gdrive/index.js";
import type { AppError, GdriveItem } from "../types/index.js";
import type { ListItem } from "./useFileOperations.js";

export type HistoryEntry = {
  id: string;
  name: string;
};

export const useGdriveBrowse = (initialFolderId = "root") => {
  const [currentId, setCurrentId] = useState<string>(initialFolderId);
  const [folderName, setFolderName] = useState<string>("Loading...");
  const [items, setItems] = useState<GdriveItem[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AppError | null>(null);

  const generateListItem = useCallback(
    (item: GdriveItem | undefined): ListItem[] => {
      if (!item) {
        return [];
      }
      const isFolder = item.type === "folder";
      return [
        {
          label: isFolder ? `📁 ${item.name}` : `📄 ${item.name}`,
          value: { id: item.id, original: item, isFolder: isFolder },
        },
      ];
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const [info, resItem] = await Promise.all([
        getInfo(currentId),
        getItems(currentId),
      ]);

      if (!isMounted) {
        return;
      }

      if (!info.success) {
        setError(info.error);
        setLoading(false);
        return;
      }
      if (!resItem.success) {
        setError(resItem.error);
        setLoading(false);
        return;
      }

      setFolderName(info.data.name);
      setItems(resItem.data);
      setLoading(false);
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [currentId]);

  const goToParent = useCallback(async () => {
    const newHistory = [...history];
    const parent = newHistory.pop();
    if (parent) {
      setHistory(newHistory);
      setCurrentId(parent.id);
      return;
    }

    const result = await getInfo(currentId);
    if (result.success && result.data.parents.length > 0) {
      setCurrentId(result.data.parents[0]);
    }
  }, [currentId, history]);

  const enterFolder = useCallback(
    (folderId: string) => {
      setHistory([...history, { id: currentId, name: folderName }]);
      setCurrentId(folderId);
    },
    [currentId, folderName, history],
  );

  return {
    currentId,
    folderName,
    items,
    history,
    loading,
    error,
    goToParent,
    enterFolder,
    generateListItem,
  };
};
