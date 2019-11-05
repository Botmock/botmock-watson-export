import * as flow from "@botmock-api/flow";
import { writeJson } from "fs-extra";
import { default as uuid } from "uuid/v4";
import { EOL } from "os";
import { join } from "path";
// import { strictEqual } from "assert";
import { default as PlatformProvider } from "./provider";

export namespace Watson {
  export enum SupportedPlatforms {
    slack = "slack",
    facebook = "facebook",
  }
  export type DialogNodes = unknown[];
  export enum Selectors {
    user = "user_input",
  }
  export enum Behaviors {
    jump = "jump_to",
    skip = "skip_user_input",
  }
  export enum SelectionPolicies {
    sequential = "sequential",
  }
  export enum EventNames {
    input = "input",
    focus = "focus",
  }
  export enum EntityTypes {
    synonyms = "synonyms",
  }
  export enum Conditions {
    anything = "anything_else",
  }
  export enum Types {
    standard = "standard",
    frame = "frame",
  }
  export enum DialogNodeTypes {
    handler = "event_handler",
    frame = "frame",
    slot = "slot",
    standard = "standard",
  }
}

export type ProjectData<T> = T extends Promise<infer K> ? K : any;

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
  private readonly parentChildSegmentedNodeMap: Map<string, string>;
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
      this.boardStructureByMessages.set(firstMessage.message_id, Array.of(uuid()));
    }
    this.parentChildSegmentedNodeMap = this.assembleParentChildSegmentedNodeMap();
  }
  /**
   * Assembles relation between parent and child dialog nodes in the segmented flow
   * 
   * @remarks changes the original board structure by messages map by relating keys
   * of that map to other keys of that map
   * 
   * @returns relation between id of parent and child messages
   */
  private assembleParentChildSegmentedNodeMap(): Map<string, string> {
    return new Map(Array.from(this.boardStructureByMessages.entries()).reduce((acc, relationPair) => {
      const [idOfParentMessageFollowingIntent] = relationPair;
      const parentMessage = this.getMessage(idOfParentMessageFollowingIntent) as flow.Message;
      const [idOfChildMessageFollowingIntent] = [parentMessage, ...this.gatherMessagesUpToNextIntent(parentMessage)]
        .map(message => message.next_message_ids)
        .reduce(((acc, nextMessages) => {
          return [
            ...acc,
            nextMessages
              .filter(message => this.boardStructureByMessages.get(message.message_id))
              .map(message => message.message_id)
              .filter(idOfMessage => typeof idOfMessage !== "undefined")
          ];
        }), []);
      return [...acc, [idOfParentMessageFollowingIntent, idOfChildMessageFollowingIntent]];
    }, []));
  }
  /**
   * Finds the dialog node that has this node as its child
   * @param nodeId id of the node whose parent must be found
   * @returns the node id of the parent
   */
  private findSegmentedParentOfDialogNode(nodeId: string): string | void {
    let idOfParentOfNodeId: string;
    for (const [idOfParent, [idOfChild]] of Array.from(this.parentChildSegmentedNodeMap.entries())) {
      if (idOfChild !== nodeId) {
        continue;
      }
      idOfParentOfNodeId = idOfParent;
    }
    if (typeof idOfParentOfNodeId === "undefined") {
      return;
    }
    return `node_${idOfParentOfNodeId}`;
  }
  /**
   * Finds the dialog node that has this node as its parent
   * @param nodeId id of the node whose child must be found
   */
  private findSegmentedChildOfDialogNode(nodeId: string): string | void {
    let idOfChildOfNodeId: string;
    for (const [idOfParent, [idOfChild]] of Array.from(this.parentChildSegmentedNodeMap.entries())) {
      if (idOfParent !== nodeId) {
        continue;
      }
      idOfChildOfNodeId = idOfChild;
    }
    if (typeof idOfChildOfNodeId === "undefined") {
      return;
    }
    return `node_${idOfChildOfNodeId}`;
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
  private mapDialogNodesForProject(): ReadonlyArray<Watson.DialogNodes> {
    const { platform } = this.projectData.project;
    const platformProvider = new PlatformProvider(platform, this.projectData);
    return Array.from(this.boardStructureByMessages.entries())
      .reduce((acc, messageAndConnectedIntents) => {
        const [idOfConnectedMessage, idsOfConnectedIntents] = messageAndConnectedIntents;
        const message = this.getMessage(idOfConnectedMessage) as flow.Message;
        const nodeId = `node_${message.message_id}`;
        const messagesImplicitInConnectedMessage: unknown[] = idsOfConnectedIntents
          .filter(intentId => {
            const requiredSlots = this.requiredSlotsByIntents.get(intentId);
            return Array.isArray(requiredSlots) && requiredSlots.length > 0;
          })
          .map(intentId => this.requiredSlotsByIntents.get(intentId) as any)
          .map(slotsRequiredForIntent => {
            const [firstRequiredSlot] = slotsRequiredForIntent;
            let iterations = 0;
            let nextValue: any[] = []
            const { name } = this.getVariable(firstRequiredSlot.variable_id);
            while (iterations < 3) {
              switch (iterations) {
                case 0:
                  nextValue.push({
                    type: Watson.DialogNodeTypes.slot,
                    parent: nodeId,
                    variable: `$${name}`,
                    dialog_node: `slot_${uuid()}`,
                  });
                  break;
                case 1:
                  nextValue.push({
                    type: Watson.DialogNodeTypes.handler,
                    parent: nextValue[0].dialog_node,
                    context: {
                      [name]: `@${name}`
                    },
                    conditions: `@${name}`,
                    event_name: Watson.EventNames.input,
                    dialog_node: `handler_${uuid()}`,
                  });
                  break;
                case 2:
                  nextValue.push({
                    type: Watson.DialogNodeTypes.handler,
                    output: {
                      text: {
                        values: [firstRequiredSlot.prompt],
                        selection_policy: Watson.SelectionPolicies.sequential,
                      }
                    },
                    parent: nextValue[0].dialog_node,
                    event_name: Watson.EventNames.focus,
                    dialog_node: `handler_${uuid()}`,
                    previous_sibling: nextValue[iterations - 1].dialog_node,
                  });
                  break;
              }
              iterations += 1;
            }
            return nextValue
          });
        const [firstCondition] = idsOfConnectedIntents
          .map(id => this.getIntent(id) as flow.Intent)
          .filter(intent => typeof intent !== "undefined")
          .map(({ name }) => `#${name}`);
        const parent = this.findSegmentedParentOfDialogNode(idOfConnectedMessage);
        const nextStep = this.findSegmentedChildOfDialogNode(idOfConnectedMessage)
          ? {
              behavior: Watson.Behaviors.jump,
              selector: Watson.Selectors.user,
              dialog_node: this.findSegmentedChildOfDialogNode(idOfConnectedMessage),
            }
          : undefined;
        return [
          ...acc,
          ...[
            ...messagesImplicitInConnectedMessage,
            {
              type: Watson.Types.standard,
              title: message.payload.nodeName,
              output: platformProvider.create(message),
              parent,
              next_step: nextStep,
              conditions: firstCondition,
              dialog_node: nodeId,
            },
          ],
        ];
      }, []);
  }
  /**
   * Strips variable sign from given name
   * @param name name of the entity
   * @returns object containing the number of characters that were removed
   * and the sanitized text itself
   */
  private sanitizeText(text: string): unknown {
    const disallowedCharactersRegex = new RegExp(/%|'|\./g);
    return {
      numCharactersViolatingRule: (text.match(disallowedCharactersRegex) || []).length,
      text: text.replace(disallowedCharactersRegex, "")
    }
  }
  /**
   * Writes watson-importable json file to output directory
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
        examples: intent.utterances.map(utterance => {
          // @ts-ignore
          const { numCharactersViolatingRule, text } = this.sanitizeText(utterance.text);
          return {
            text,
            mentions: utterance.variables.map(variable => {
              const startIndex = parseInt(variable.start_index, 10);
              const endIndex = startIndex + variable.name.length - numCharactersViolatingRule;
              // @ts-ignore
              const { text } = this.sanitizeText(variable.name);
              return {
                entity: text.replace(/\s/g, ""),
                location: [startIndex, endIndex],
              }
            }),
          }
        }),
      })),
      entities: this.projectData.entities.map(entity => ({
        entity: entity.name,
        values: entity.data.map((datapoint: any) => ({
          type: Watson.EntityTypes.synonyms,
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
      },
      skill_id: uuid(),
      description: new Date().toLocaleString(),
      dialog_nodes: this.mapDialogNodesForProject(),
      workspace_id: uuid(),
      counterexamples: [],
      system_settings: {
        spelling_auto_correct: true,
      },
      learning_opt_out: false,
      status: FileWriter.status,
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
