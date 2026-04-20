export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

export const formatBytes = (bytes: string | number): string => {
  const b = typeof bytes === "string" ? Number.parseInt(bytes, 10) : bytes;
  if (Number.isNaN(b)) {
    return "0 B";
  }
  if (b === 0) {
    return "0 B";
  }
  const i = Math.floor(Math.log(b) / Math.log(1024));
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  return `${(b / 1024 ** i).toFixed(2)} ${sizes[i]}`;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) {
    return str;
  }
  return str.slice(0, length) + "...";
};

// --- Result Helpers ---
import type { AppError, Result } from "../types/index.js";

export const success = <T>(data: T): Result<T, never> => ({
  success: true,
  data,
});

export const failure = <E extends AppError>(error: E): Result<never, E> => ({
  success: false,
  error,
});
