import { execa } from "execa";
import type { GdriveItem, Result } from "../../types/index.js";
import { failure, success } from "../../utils/index.js";

export async function getItems(
  parentId: string,
): Promise<Result<GdriveItem[]>> {
  if (!parentId) {
    return {
      success: false,
      error: {
        type: "INVALID_ID",
        message: "Parent ID is required",
      },
    };
  }
  try {
    const { stdout } = await execa("gdrive", [
      "files",
      "list",
      "--parent",
      parentId,
    ]);
    const lines = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const dataLines = lines.filter((ln) => !/^Id\b/.test(ln));
    const items = dataLines.map((line) => {
      const cols = line
        .split(/\s{2,}/)
        .map((c) => c.trim())
        .filter(Boolean);
      const id = cols[0] ?? "";
      const name = cols[1] ?? "";
      const type = cols[2] ?? "";
      const size = cols[3] ?? "";
      const created = cols[4] ?? "";
      return { id, name, type: type as "file" | "folder", size, created };
    });
    return success(items);
  } catch (err: any) {
    return failure({
      type: "GDRIVE_COMMAND_FAILED",
      message: err?.stderr ?? err?.message,
      originalError: err,
    });
  }
}
