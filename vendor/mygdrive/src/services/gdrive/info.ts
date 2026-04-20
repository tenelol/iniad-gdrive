import {
  GDRIVE_INFO_KEYS,
  type GdriveInfo,
  type GdriveInfoKey,
  type Result,
} from "../../types/index.js";
import { success } from "../../utils/index.js";
import { executeGdriveCommand } from "./client.js";

const isKnownKey = (key: string): key is GdriveInfoKey => {
  return (GDRIVE_INFO_KEYS as readonly string[]).includes(key);
};

const parseInfo = (stdout: string): GdriveInfo => {
  return stdout.split(/\r?\n/).reduce((acc, line) => {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) {
      return acc;
    }
    const key = m[1].trim().toLowerCase();
    const val = m[2].trim();
    if (!isKnownKey(key)) {
      return acc;
    }
    if (key === "shared") {
      return { ...acc, [key]: /true/i.test(val) };
    }
    if (key === "parents") {
      return { ...acc, [key]: val.split(",").map((s) => s.trim()) };
    }
    return { ...acc, [key]: val };
  }, {} as GdriveInfo);
};

export const getInfo = async (id: string): Promise<Result<GdriveInfo>> => {
  const result = await executeGdriveCommand(["files", "info", id]);

  if (!result.success) {
    return result;
  }

  return success(parseInfo(result.data));
};
