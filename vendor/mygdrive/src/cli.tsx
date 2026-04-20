import { Command } from "commander";
import { render } from "ink";
import App from "./components/pages/DriveBrowserPage.js";

const pkg = { version: "0.1.0" };
const program = new Command();
program
  .name("mygdrive")
  .description("Wrapper for gdrive CLI")
  .version(pkg.version);

program
  .command("browse [folderId]")
  .description("Browse Drive in a TUI and download files")
  .action(async (folderId: string | undefined) => {
    render(<App initialFolderId={folderId} />);
  });

program.parse(process.argv);
