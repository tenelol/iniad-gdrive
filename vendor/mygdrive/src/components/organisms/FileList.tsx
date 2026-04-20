import { Box } from "ink";
import SelectInput from "ink-select-input";
import type { ListItem } from "../../hooks/useFileOperations.js";
import type { IconType } from "../atoms/Icon.js";
import { FileRow } from "../molecules/FileRow.js";

type FileListProps = {
  items: ListItem[];
  onSelect: (item: ListItem) => void;
  onHighlight: (item: ListItem) => void;
};

const ItemComponent = ({ value, isSelected }: any) => {
  const iconType: IconType = value.isBack
    ? "back"
    : value.isFolder
      ? "folder"
      : "file";
  // Handle case where original might be incomplete for 'back' item
  const item = value.isBack
    ? {
        ...value.original,
        name: ".. (up)",
        type: "folder" as const,
        size: "",
        created: "",
      }
    : value.original;

  return <FileRow item={item} isSelected={!!isSelected} iconType={iconType} />;
};

export const FileList = ({ items, onSelect, onHighlight }: FileListProps) => {
  return (
    <Box padding={1} borderStyle="single" borderColor="green">
      <SelectInput
        items={items.map((item) => ({
          ...item,
          key: item.value.id,
        }))}
        onSelect={onSelect}
        onHighlight={onHighlight}
        itemComponent={ItemComponent}
        limit={10}
      />
    </Box>
  );
};
