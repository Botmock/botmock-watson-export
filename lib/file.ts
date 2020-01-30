import * as flow from "@botmock-api/flow";
import { default as uuid } from "uuid/v4";
import { writeJson } from "fs-extra";
import { join } from "path";
import { EOL } from "os";
import { default as PlatformProvider } from "./provider";
import { ObjectLike, Watson, ProjectData, Config } from "./types";

export { Watson } from "./types";

export default class FileWriter extends flow.AbstractProject {
  static language = "en";
  static majorVersion = "v1";
  static minorVersion = "2018-09-20";
  static status = "Available";
  private boardStructureByMessages: flow.SegmentizedStructure;
  private requiredSlotsByIntents: flow.SlotStructure;
  private readonly outputDirectory: string;
  private didSetPseudoWelcomeIntent: boolean = false;
  private readonly parentChildSegmentedNodeMap: Map<string, string[]>;
  /**
   * Creates new instance of FileWriter class
   * @remarks Creates artificial welcome intent between the root node and the
   * first message if no intent is present
   * @param config Object containing project data and path to output directory
   */
  constructor(config: Config) {
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
      this.didSetPseudoWelcomeIntent = true;
    }
    this.parentChildSegmentedNodeMap = this.assembleParentChildSegmentedNodeMap();
  }
  /**
   * Assembles relation between parent and child dialog nodes in the segmented flow
   * @remarks changes the original board structure by messages map by relating keys
   * of that map to other keys of that map
   * @returns relation between id of parent and child messages
   */
  private assembleParentChildSegmentedNodeMap(): Map<string, string[]> {
    return new Map(Array.from(this.boardStructureByMessages.entries())
      .reduce((acc, relationPair): any => {
        const [idOfParentMessageFollowingIntent] = relationPair;
        const parentMessage = this.getMessage(idOfParentMessageFollowingIntent) as flow.Message;
        const [idOfChildMessageFollowingIntent] = [parentMessage, ...this.gatherMessagesUpToNextIntent(parentMessage)]
          .map(message => message.next_message_ids as flow.NextMessage[])
          .reduce(((acc, nextMessages): any => {
            return [
              ...acc,
              nextMessages
                .filter(message => this.boardStructureByMessages.get(message.message_id))
                .map(message => message.message_id)
                .filter(idOfMessage => typeof idOfMessage !== "undefined"),
            ];
          }), []);
        return [...acc, [idOfParentMessageFollowingIntent, idOfChildMessageFollowingIntent]];
      }, []));
  }
  /**
   * Finds parent of connected message
   * @param nodeId id of the node whose parent must be found
   */
  private findParentOfConnectedMessage(nodeId: string): ObjectLike<string | void> {
    for (const [idOfParent, idsOfChildren] of Array.from(this.parentChildSegmentedNodeMap.entries())) {
      for (const idOfChild of idsOfChildren) {
        if (idOfChild === nodeId) {
          return {
            id: `node_${idOfParent}`,
          };
        }
      }
    }
    return {};
  }
  /**
   * Finds the dialog node that has this node as its parent
   * @param nodeId id of the node whose child must be found
   */
  // private findSegmentedChildOfDialogNode(nodeId: string): string | void {
  //   let idOfChildOfNodeId = "";
  //   for (const [idOfParent, [idOfChild]] of Array.from(this.parentChildSegmentedNodeMap.entries())) {
  //     if (idOfParent !== nodeId) {
  //       continue;
  //     }
  //     idOfChildOfNodeId = idOfChild;
  //   }
  //   if (idOfChildOfNodeId === "") {
  //     return;
  //   }
  //   return `node_${idOfChildOfNodeId}`;
  // }
  /**
   * Gets full variable from an id
   * @param variableId id of a variable to get
   */
  private getVariable(variableId: string): Partial<flow.Variable> {
    return this.projectData.variables.find(variable => variable.id === variableId) ?? {};
  }
  /**
   * Creates array of interrelated dialog nodes from flow structure
   * @remarks on each iteration over board structure by messages,
   * adds additional dialog nodes to the accumulator based on presence
   * of any required slots
   * @returns an array of dialog nodes representing the project structure
   * @todo add appropriate `next_step`
   */
  private mapDialogNodesForProject(): ReadonlyArray<Watson.DialogNodes> {
    const { platform } = this.projectData.project;
    const platformProvider = new PlatformProvider(platform, this.projectData);
    const seenSiblings: string[] = [];
    return Array.from(this.boardStructureByMessages.entries())
      .reduce((acc: Watson.DialogNodes[], messageAndConnectedIntents): any => {
        const [idOfConnectedMessage, idsOfConnectedIntents] = messageAndConnectedIntents;
        const message = this.getMessage(idOfConnectedMessage) as flow.Message;
        const nodeId = `node_${message.message_id}`;
        const messagesImplicitInConnectedMessage: ObjectLike<string | object>[] = idsOfConnectedIntents
          .filter(intentId => {
            const requiredSlots = this.requiredSlotsByIntents.get(intentId);
            return Array.isArray(requiredSlots) && requiredSlots.length > 0;
          })
          .map(intentId => this.requiredSlotsByIntents.get(intentId) as any)
          // turn required slots into dialog node triple
          .reduce((acc, slotsRequiredForIntent) => {
            const [firstRequiredSlot] = slotsRequiredForIntent;
            let iterations = 0;
            let nextValue: ObjectLike<string | object>[] = [];
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
                      [name as string]: `@${name}`
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
            return [...acc, ...nextValue];
          }, []);
        const [firstCondition = "#welcome"] = idsOfConnectedIntents
          .map(id => this.getIntent(id) as flow.Intent)
          .filter(intent => typeof intent !== "undefined")
          .map(({ name }) => `#${name}`);
        let { id: parentNodeId } = this.findParentOfConnectedMessage(idOfConnectedMessage) ?? {};
        let previousSibling: string | null = null;
        let lastNodeInAccumulatorWithComputedParent: any;
        for (const node in acc) {
          const { dialog_node: previousSiblingNodeId, parent } = node as any;
          if (parent === parentNodeId && !seenSiblings.includes(previousSiblingNodeId)) {
            lastNodeInAccumulatorWithComputedParent = node;
            seenSiblings.push(previousSiblingNodeId);
          }
        }
        if (typeof lastNodeInAccumulatorWithComputedParent !== "undefined") {
          previousSibling = lastNodeInAccumulatorWithComputedParent.dialog_node;
        }
        return [
          ...acc,
          ...messagesImplicitInConnectedMessage,
          {
            type: Watson.Types.standard,
            title: message.payload?.nodeName,
            output: platformProvider.create(message),
            parent: parentNodeId,
            // @todo
            next_step: undefined,
            previous_sibling: previousSibling,
            conditions: firstCondition,
            dialog_node: nodeId,
          },
        ];
      }, []);
  }
  /**
   * Strips variable sign from given name
   * @param name name of the entity
   * @returns object containing the number of characters that were removed
   * and the sanitized text itself
   */
  private sanitizeText(text: string): { [key: string]: any; } {
    const disallowedCharactersRegex = new RegExp(/%|'|\./g);
    return {
      numCharactersViolatingRule: (text.match(disallowedCharactersRegex) || []).length,
      text: text.replace(disallowedCharactersRegex, "")
    };
  }
  /**
   * Writes watson-importable json file to output directory
   */
  private async writeWatsonImportableJSONFile(): Promise<void> {
    const { name } = this.projectData.project;
    const pseudoIntent = this.didSetPseudoWelcomeIntent ? [{
      name: "welcome",
      created_at: { date: new Date().toLocaleString() },
      utterances: [{ text: "hi" }, { text: "hello" }],
    }] : [];
    const skillData = {
      name,
      intents: [...this.projectData.intents, ...pseudoIntent as any].map(intent => ({
        intent: intent.name,
        description: intent.created_at.date,
        examples: intent.utterances.map((utterance: flow.Utterance) => {
          const { numCharactersViolatingRule, text } = this.sanitizeText(utterance.text);
          const { variables = [] } = utterance;
          return {
            text,
            mentions: variables.map(variable => {
              const startIndex = parseInt(variable.start_index, 10);
              const endIndex = startIndex + variable.name.length - numCharactersViolatingRule;
              const { text } = this.sanitizeText(variable.name);
              return {
                entity: text.replace(/\s/g, ""),
                location: [startIndex, endIndex],
              };
            }),
          };
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
        tooling: {
          store_generic_responses: true,
        },
      },
      learning_opt_out: false,
      status: FileWriter.status,
    };
    await writeJson(join(this.outputDirectory, `${name}.json`), skillData, { EOL, spaces: 2 });
  }
  /**
   * Writes necessary files to output directory
   */
  public async write(): Promise<void> {
    await this.writeWatsonImportableJSONFile();
  }
}
