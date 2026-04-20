import { execa } from "execa";
import type { Result } from "../../types/index.js";
import { failure, success } from "../../utils/index.js";

export const executeGdriveCommand = async (
  args: string[],
): Promise<Result<string>> => {
  try {
    const { stdout } = await execa("gdrive", args);
    return success(stdout);
  } catch (err: any) {
    return failure({
      type: "GDRIVE_COMMAND_FAILED",
      message:
        err?.stderr ?? err?.message ?? "An unknown gdrive error occurred",
      originalError: err,
    });
  }
};
