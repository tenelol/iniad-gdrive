import { execa } from "execa";
import type { Result } from "../../types/index.js";

export const downloadFile = async (id: string): Promise<Result<void>> => {
  try {
    await execa("gdrive", ["files", "download", id]);
    return { success: true, data: undefined };
  } catch (err: any) {
    return {
      success: false,
      error: {
        type: "GDRIVE_COMMAND_FAILED",
        message: err?.stderr ?? err?.message,
        originalError: err,
      },
    };
  }
};
