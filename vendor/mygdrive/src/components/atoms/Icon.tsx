import { Text } from "ink";
import type React from "react";

export type IconType =
  | "file"
  | "folder"
  | "back"
  | "download"
  | "info"
  | "error"
  | "success";

type IconProps = {
  type: IconType;
};

const ICONS = {
  folder: "📂",
  file: "📄",
  back: "↩️ ",
  download: "⬇️ ",
  info: "ℹ️ ",
  success: "✅",
  error: "❌",
} as const;

export const Icon: React.FC<IconProps> = ({ type }) => {
  return <Text>{ICONS[type] ?? "❓"}</Text>;
};
