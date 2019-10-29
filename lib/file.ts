import * as flow from "@botmock-api/flow";
import { writeJson } from "fs-extra";
import { default as uuid } from "uuid/v4";
import { EOL } from "os";
import { join } from "path";
// import { default as PlatformProvider } from "./provider";

type ProjectData<T> = T extends Promise<infer K>[] ? K : any;

// type DialogNode<T extends { [key: string]: any }> = {};

enum DialogNodeTypes {
  handler = "event_handler",
  frame = "frame",
  slot = "slot",
  standard = "standard",
}

interface IConfig {
  readonly outputDirectory: string;
  readonly projectData: unknown;
}

export default class FileWriter extends flow.AbstractProject {
  static language = "en";
  static majorVersion = "v1";
  static minorVersion = "2018-09-20";
  static status = "Available";
  private boardStructureByMessages: flow.SegmentizedStructure;
  private readonly outputDirectory: string;
  private readonly firstMessage: unknown;
  /**
   * Creates new instance of FileWriter class
   * 
   * @remarks Creates artificial welcome intent between the root node and the
   * first message if no intent is present
   * 
   * @param config Object containing project data and path to output directory
   */
  constructor(config: IConfig) {
    super({ projectData: config.projectData as ProjectData<typeof config.projectData> });
    this.outputDirectory = config.outputDirectory;
    this.boardStructureByMessages = this.segmentizeBoardFromMessages();
    const { root_messages } = this.projectData.board.board;
    const [idOfRootMessage] = root_messages;
    if (!this.boardStructureByMessages.get(idOfRootMessage)) {
      const rootMessage = this.getMessage(idOfRootMessage) as flow.Message;
      const [firstMessage] = rootMessage.next_message_ids as flow.NextMessage[];
      this.firstMessage = firstMessage;
      this.boardStructureByMessages.set(firstMessage.message_id, Array.of(uuid()));
    }
  }
  /**
   * Creates array of interrelated dialog nodes from flow structure
   * 
   * @remarks ..
   * 
   * @returns ReadonlyArray<unknown>
   */
  private mapDialogNodesForProject(): ReadonlyArray<unknown> {
    return Array.from(this.boardStructureByMessages.entries())
      .reduce((acc, messageAndConnectedIntents) => {
        const nodesImpliedByMessageAndConnectedIntents = [];
        return [
          ...acc,
          ...nodesImpliedByMessageAndConnectedIntents,
        ];
      }, []);
  }
  /**
   * Strips variable sign from given name
   * @param name name of the entity
   * @returns string
   */
  private getSanitizedEntityName(name: string): string {
    return name.replace(/%/g, "");
  }
  /**
   * Writes watson-importable json file to output directory
   * 
   * @remarks ..
   * 
   * @returns Promise<void>
   */
  private async writeWatsonImportableJSONFile(): Promise<void> {
    const { name } = this.projectData.project;
    const skillData = {
      name,
      intents: this.projectData.intents.map(intent => ({
        intent: intent.name,
        description: JSON.stringify({
          // @ts-ignore
          createdAt: intent.created_at.date,
          isGlobal: intent.is_global,
        }),
        examples: intent.utterances.map(utterance => ({
          text: this.getSanitizedEntityName(utterance.text),
          mentions: utterance.variables.map(variable => {
            const startIndex = parseInt(variable.start_index, 10) - 1;
            const endIndex = startIndex + variable.name.length - 2;
            // const entity = this.projectData.entities.find(entity => entity.id === variable.entity);
            return {
              entity: this.getSanitizedEntityName(variable.name),
              location: [startIndex, endIndex],
            }
          }),
        })),
      })),
      entities: this.projectData.entities.map(entity => ({
        entity: entity.name,
        values: entity.data.map((datapoint: any) => ({
          type: "synonyms",
          value: datapoint.value,
          synonyms: datapoint.synonyms,
        })),
      })),
      language: FileWriter.language,
      metadata: {
        api_version: {
          major_version: FileWriter.majorVersion,
          minor_version: FileWriter.minorVersion,
        },
        skill_id: uuid(),
        description: "",
        dialog_nodes: this.mapDialogNodesForProject(),
        workspace_id: uuid(),
        counterexamples: [],
        system_settings: {
          spelling_auto_correct: true,
        },
        learning_opt_out: false,
        status: FileWriter.status,
      }
    };
    await writeJson(join(this.outputDirectory, `${name}.json`), skillData, { EOL, spaces: 2 });
  }
  /**
   * Writes necessary files to output directory
   * @returns Promise<void>
   */
  public async write(): Promise<void> {
    await this.writeWatsonImportableJSONFile();
  }
}
