import chalk from "chalk";
import { execa } from "execa";

export async function ensureGdrive() {
  try {
    await execa("gdrive", ["version"]);
  } catch {
    console.error(
      chalk.red(
        "`gdrive` CLI が見つかりません。https://github.com/prasmussen/gdrive を参照してインストールしてください。",
      ),
    );
    process.exit(1);
  }
}
