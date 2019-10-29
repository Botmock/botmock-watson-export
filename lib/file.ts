import * as flow from "@botmock-api/flow";
import { writeJson } from "fs-extra";
import { default as uuid } from "uuid/v4";
import { EOL } from "os";
import { join } from "path";
import { default as PlatformProvider } from "./provider";

export type ProjectData<T> = T extends Promise<infer K> ? K : any;

export enum DialogNodeTypes {
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
  private requiredSlotsByIntents: flow.SlotStructure;
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
    this.requiredSlotsByIntents = this.representRequirementsForIntents();
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
   * Finds the dialog node that has this node as its child
   * @param nodeId id of the node whose parent must be found
   * @returns the node id of the parent
   * @todo
   */
  private findSegmentedParentOfDialogNode(nodeId: string): string | void {
    return "";
  }
  /**
   * Gets any intent necessary for node id
   * @param nodeId id of the node whose conditions must be found
   * @returns the name of any necessary condition
   * @todo
   */
  private getConditionsForDialogNode(nodeId: string): string | void {
    return "";
  }
  /**
   * Gets full variable from an id
   * @param variableId id of a variable to get
   */
  private getVariable(variableId: string): Partial<flow.Variable> {
    return this.projectData.variables.find(variable => variable.id === variableId);
  }
  /**
   * Creates array of interrelated dialog nodes from flow structure
   * 
   * @remarks on each iteration over board structure by messages,
   * adds additional dialog nodes to the accumulator based on presence
   * of any required slots
   * 
   * @returns an array of dialog nodes representing the project structure
   */
  private mapDialogNodesForProject(): ReadonlyArray<unknown> {
    const { platform } = this.projectData.project;
    const platformProvider = new PlatformProvider(platform);
    return Array.from(this.boardStructureByMessages.entries())
      .reduce((acc, messageAndConnectedIntents) => {
        const [idOfConnectedMessage, idsOfConnectedIntents] = messageAndConnectedIntents;
        const message = this.getMessage(idOfConnectedMessage) as flow.Message;
        const messagesExplicitInConnectedMessage: ReadonlyArray<typeof message> = [
          message,
          ...this.gatherMessagesUpToNextIntent(message)
        ];
        const messagesImplicitInConnectedMessage: unknown[] = [];
        const nodeId = `node_${uuid()}`;
        for (const intentId of idsOfConnectedIntents) {
          const requiredSlots = this.requiredSlotsByIntents.get(intentId);
          if (Array.isArray(requiredSlots) && requiredSlots.length > 0) {
            const slotNodeId = `slot_${uuid()}`;
            const [firstRequiredSlot] = requiredSlots;
            const { name: variableName } = this.getVariable(firstRequiredSlot.variable_id);
            messagesImplicitInConnectedMessage.push({
              type: DialogNodeTypes.slot,
              parent: nodeId,
              variable: `$${variableName}`,
              slot: slotNodeId,
            });
          }
        }
        return [
          ...acc,
          ...[
            ...messagesImplicitInConnectedMessage,
            ...messagesExplicitInConnectedMessage.map((message: Partial<flow.Message>) => ({
              dialog_node: nodeId,
              ...platformProvider.create(message.message_type, message.payload)
            })),
          ],
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
        // @ts-ignore
        description: intent.created_at.date,
        examples: intent.utterances.map(utterance => ({
          text: this.getSanitizedEntityName(utterance.text),
          mentions: utterance.variables.map(variable => {
            const startIndex = parseInt(variable.start_index, 10);
            const endIndex = startIndex + variable.name.length - 2;
            // const entityInVariable = this.projectData.entities.find(entity => (
            //   entity.id === variable.entity
            // ));
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
