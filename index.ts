import "dotenv/config";
import { Batcher } from "@botmock-api/client";
import { default as log } from "@botmock-api/log";
import { remove, mkdirp, writeJson } from "fs-extra";
import { EOL } from "os";
import { join } from "path";
import { default as FileWriter } from "./lib/file";

interface Paths {
  readonly outputPath: string;
}

/**
 * Removes and then creates the directories that hold generated files
 * @param paths object containing paths to directories that will hold files
 * generated by the script
 */
async function recreateOutputDirectories(paths: Paths): Promise<void> {
  const { outputPath } = paths;
  await remove(outputPath);
  await mkdirp(outputPath);
}

/**
 * Calls all fetch methods and calls all write methods
 * @remark entry point to the script
 * @param args argument vector
 */
async function main(args: string[]): Promise<void> {
  const DEFAULT_OUTPUT = "output";
  let [,, outputDirectory] = args;
  if (typeof outputDirectory === "undefined") {
    outputDirectory = process.env.OUTPUT_DIR || DEFAULT_OUTPUT;
  }
  log("creating output directories");
  await recreateOutputDirectories({ outputPath: outputDirectory, });
  log("fetching project data");
  // @ts-ignore
  const { data: projectData } = await new Batcher({
    token: process.env.BOTMOCK_TOKEN as string,
    teamId: process.env.BOTMOCK_TEAM_ID as string,
    projectId: process.env.BOTMOCK_PROJECT_ID as string,
    boardId: process.env.BOTMOCK_BOARD_ID as string,
  }).batchRequest([
    "project",
    "board",
    "intents",
    "entities",
    "variables"
  ]);
  log("writing file");
  const fileWriter = new FileWriter({
    outputDirectory,
    projectData
  });
  // @ts-ignore
  fileWriter.on("write-complete", ({ basename }) => {
    log(`wrote ${basename}`);
  });
  await fileWriter.write();
  log("done");
}

process.on("unhandledRejection", () => {});
process.on("uncaughtException", () => {});

main(process.argv).catch(async (err: Error) => {
  log(err.stack as string, { isError: true });
  if (process.env.OPT_IN_ERROR_REPORTING) {
    // Sentry.captureException(err);
  } else {
    const { message, stack } = err;
    await writeJson(join(__dirname, "err.json"), { message, stack }, { EOL, spaces: 2 });
  }
});
