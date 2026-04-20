export type GdriveErrorType =
  | "GDRIVE_NOT_FOUND"
  | "GDRIVE_COMMAND_FAILED"
  | "INVALID_ID"
  | "UNKNOWN_ERROR";

export type AppError = {
  type: GdriveErrorType;
  message: string;
  originalError?: unknown;
};

export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

export type AppFileItem = {
  id: string;
  name: string;
  type: "file" | "folder";
  size: string;
  created: string;
};

export type GdriveItem = AppFileItem;

export const GDRIVE_INFO_KEYS = [
  "id",
  "name",
  "mime",
  "size",
  "created",
  "modified",
  "shared",
  "parents",
  "viewUrl",
] as const;

export type GdriveInfoKey = (typeof GDRIVE_INFO_KEYS)[number];

export type GdriveInfo = {
  [K in GdriveInfoKey]: K extends "shared"
    ? boolean
    : K extends "parents"
      ? string[]
      : string;
};
