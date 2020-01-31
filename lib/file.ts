import * as flow from "@botmock-api/flow";
import { default as uuid } from "uuid/v4";
import { writeJson } from "fs-extra";
// import { strictEqual, strict } from "assert";
import { join } from "path";
import { EOL } from "os";
import { default as PlatformProvider } from "./provider";
import { ObjectLike, Watson, ProjectData, Slots, Config } from "./types";

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
  // private previousSiblingMap: Map<string, string>;
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
    // this.previousSiblingMap = new Map();
    // for (const en of this.boardStructureByMessages.entries()) {
    //   const [parentNodeId] = en;
    //   const fullParentNode = this.getMessage(parentNodeId);
    //   for (const n of [fullParentNode, ...this.gatherMessagesUpToNextIntent(fullParentNode as flow.Message)]) {
    //   }
    // }
  }
  /**
   * Gets full variable from an id
   * @param variableId id of a variable to get
   */
  private getVariable(variableId: string): Partial<flow.Variable> {
    return this.projectData.variables.find(variable => variable.id === variableId) ?? {};
  }
  /**
   * Turns required slots into dialog node triples
   * @param connectedIntentIds ids of connected intents
   * @param parent parent from linked list of siblings
   */
  private getSlotNodesForConnectedIntentIds(ids: string[], parent: string): Slots {
    // strictEqual(Object.is(parent, null), undefined);
    // strictEqual(Object.is(parent, null), null);
    return ids
      .filter(intentId => {
        const requiredSlots = this.requiredSlotsByIntents.get(intentId);
        return Array.isArray(requiredSlots) && requiredSlots.length > 0;
      })
      .map(intentId => this.requiredSlotsByIntents.get(intentId) as any)
      .reduce((acc, slotsRequiredForIntent) => {
        const [firstRequiredSlot] = slotsRequiredForIntent;
        let iterations = 0;
        let nextValue: ObjectLike<string | object>[] = [];
        const { name } = this.getVariable(firstRequiredSlot.variable_id);
        while (iterations < 3) {
          switch (iterations) {
            case 0:
              const slotId = `slot_${uuid()}`;
              nextValue.push({
                type: Watson.DialogNodeTypes.SLOT,
                title: slotId,
                parent,
                variable: `$${name}`,
                dialog_node: slotId,
              });
              break;
            case 1:
              const handlerId = `handler_${uuid()}`;
              nextValue.push({
                type: Watson.DialogNodeTypes.HANDLER,
                parent: nextValue[0].dialog_node,
                context: {
                  [name as string]: `@${name}`
                },
                conditions: `@${name}`,
                event_name: Watson.EventNames.input,
                dialog_node: handlerId,
              });
              break;
            case 2:
              const promptHandlerId = `handler_${uuid()}`;
              nextValue.push({
                type: Watson.DialogNodeTypes.HANDLER,
                title: promptHandlerId,
                output: {
                  text: {
                    values: [firstRequiredSlot.prompt],
                    selection_policy: Watson.SelectionPolicies.sequential,
                  }
                },
                parent: nextValue[1].dialog_node,
                event_name: Watson.EventNames.focus,
                dialog_node: promptHandlerId,
              });
              break;
          }
          iterations += 1;
        }
        return [...acc, ...nextValue];
      }, []);
  }
  /**
   * @param childNodeId id of the node whose parent we are looking for
   */
  private findParentOfChild(childNodeId: string): string | void {
    for (const en of this.boardStructureByMessages.entries()) {
      const [parentNodeId] = en;
      const fullParentNode = this.getMessage(parentNodeId);
      for (const n of [fullParentNode, ...this.gatherMessagesUpToNextIntent(fullParentNode as flow.Message)]) {
        // @ts-ignore
        if (n.next_message_ids.map(v => v.message_id).includes(childNodeId)) {
          return `node_${parentNodeId}`;
        }
      }
    }
  }
  /**
   * Creates array of interrelated dialog nodes from flow structure
   * @see https://cloud.ibm.com/docs/assistant?topic=assistant-api-dialog-modify
   * @remarks on each iteration over board structure by messages tracks required slots
   * @returns an array of dialog nodes representing the project structure
   */
  private mapDialogNodesForProject(): Watson.DialogNodes {
    const platformProvider = new PlatformProvider(this.projectData.project.platform, this.projectData);
    const nodes = Array.from(this.boardStructureByMessages.entries())
      .reduce((acc: Watson.DialogNodes[], messageAndConnectedIntents): any => {
        const [idOfConnectedMessage, idsOfConnectedIntents] = messageAndConnectedIntents;
        const nodeId = `node_${idOfConnectedMessage}`;
        const [firstCondition = "#welcome"] = idsOfConnectedIntents
          .map(id => this.getIntent(id) as flow.Intent)
          .filter(intent => typeof intent !== "undefined")
          .map(({ name }) => `#${name}`);
        const parentNode = this.findParentOfChild(idOfConnectedMessage);
        let previousSibling = null;
        for (const n of acc) {
          // if they share the same parent, set previous sibling accordingly
          if (n.parent === parentNode) {
            previousSibling = n.dialog_node;
          }
        }
        // const slotNodes = this.getSlotNodesForConnectedIntentIds(idsOfConnectedIntents, parentNode as string);
        // const [slotNodeSibling] = slotNodes;
        // // If there are slot nodes, the previous sibling should be set to the first slot node
        // if (typeof slotNodeSibling !== "undefined") {
        //   // @ts-ignore
        //   previousSibling = slotNodeSibling.dialog_node;
        // }
        const type = [].length > 0 ? Watson.DialogNodeTypes.FRAME : Watson.DialogNodeTypes.STANDARD;
        const message = this.getMessage(idOfConnectedMessage) as flow.Message;
        return [
          ...acc,
          // ...slotNodes,
          {
            type,
            title: message.payload?.nodeName,
            output: platformProvider.create(message),
            parent: parentNode ?? null,
            previous_sibling: previousSibling,
            conditions: firstCondition,
            dialog_node: nodeId,
          },
        ];
      }, []);
    // @ts-ignore
    return nodes;
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
