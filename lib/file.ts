import * as flow from "@botmock-api/flow";
// import { writeJson, readFile, stat } from "fs-extra";
// import { default as BoardBoss } from "./board";
import { default as PlatformProvider } from "./provider";
import * as Watson from "./types";

interface Config {
  readonly outputDirectory: string;
  readonly projectData: any;
}

export default class FileWriter extends flow.AbstractProject {
  private readonly outputDirectory: string;
  private boardStructureByMessages: flow.SegmentizedStructure;
  /**
   * Creates new instance of FileWriter class
   * 
   * @remarks ..
   * 
   * @param config Config object containing outputDirectory and projectData
   */
  constructor(config: Config) {
    super({ projectData: config.projectData });
    this.outputDirectory = config.outputDirectory;
    this.boardStructureByMessages = this.segmentizeBoardFromMessages();
  }
  /**
   * @returns Promise<void>
   */
  private async writeDialog(): Promise<void> {
    return;
  }
  /**
   * Writes necessary files to output directory
   * @returns Promise<void>
   */
  public async write(): Promise<void> {
    await this.writeDialog();
  }
}
