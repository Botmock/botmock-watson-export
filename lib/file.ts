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
   * @param tail tail from linked list of siblings
   */
  private getSlotNodesForConnectedIntentIds(ids: string[], tail: string): ReadonlyArray<ObjectLike<string | object>> {
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
              nextValue.push({
                type: Watson.DialogNodeTypes.SLOT,
                parent: tail,
                variable: `$${name}`,
                dialog_node: `slot_${uuid()}`,
              });
              break;
            case 1:
              nextValue.push({
                type: Watson.DialogNodeTypes.HANDLER,
                parent: tail,
                previous_sibling: nextValue[0].dialog_node,
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
                type: Watson.DialogNodeTypes.HANDLER,
                output: {
                  text: {
                    values: [firstRequiredSlot.prompt],
                    selection_policy: Watson.SelectionPolicies.sequential,
                  }
                },
                parent: tail,
                previous_sibling: nextValue[1].dialog_node,
                event_name: Watson.EventNames.focus,
                dialog_node: `handler_${uuid()}`,
                // previous_sibling: nextValue[iterations - 1].dialog_node,
              });
              break;
          }
          iterations += 1;
        }
        return [...acc, ...nextValue];
      }, []);
  }
  /**
   * Creates array of interrelated dialog nodes from flow structure
   * @see https://cloud.ibm.com/docs/assistant?topic=assistant-api-dialog-modify
   * @remarks on each iteration over board structure by messages tracks required slots
   * @returns an array of dialog nodes representing the project structure
   */
  private mapDialogNodesForProject(): ReadonlyArray<Watson.DialogNodes> {
    const { platform } = this.projectData.project;
    const platformProvider = new PlatformProvider(platform, this.projectData);
    const seenSiblings: string[] = [];
    return Array.from(this.boardStructureByMessages.entries())
      .reduce((acc: Watson.DialogNodes[], messageAndConnectedIntents): any => {
        const [idOfConnectedMessage, idsOfConnectedIntents] = messageAndConnectedIntents;
        const nodeId = `node_${idOfConnectedMessage}`;
        const [firstCondition = "#welcome"] = idsOfConnectedIntents
          .map(id => this.getIntent(id) as flow.Intent)
          .filter(intent => typeof intent !== "undefined")
          .map(({ name }) => `#${name}`);
        let parentNode: string = "";
        let previousSibling: string | null = null;
        let lastNodeInAccumulatorWithComputedParent: any;
        for (const node of acc) {
          const { dialog_node: previousSiblingNodeId, parent } = node as any;
          if (parent === parentNode && !seenSiblings.includes(previousSiblingNodeId)) {
            lastNodeInAccumulatorWithComputedParent = node;
            seenSiblings.push(previousSiblingNodeId);
          }
        }
        if (typeof lastNodeInAccumulatorWithComputedParent !== "undefined") {
          previousSibling = lastNodeInAccumulatorWithComputedParent.dialog_node;
        }
        const tail = previousSibling ?? seenSiblings[seenSiblings.length - 1];
        const messagesImplicitInConnectedMessage
          = this.getSlotNodesForConnectedIntentIds(idsOfConnectedIntents, tail);
        const type = messagesImplicitInConnectedMessage.length > 0
          ? Watson.DialogNodeTypes.FRAME : Watson.DialogNodeTypes.STANDARD;
        const message = this.getMessage(idOfConnectedMessage) as flow.Message;
        return [
          ...acc,
          ...messagesImplicitInConnectedMessage,
          {
            type,
            title: message.payload?.nodeName,
            output: platformProvider.create(message),
            parent: parentNode,
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
