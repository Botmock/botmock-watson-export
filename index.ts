import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import assert from "assert";
import Provider from "./lib/Provider";
import getProjectData from "./lib/util/client";
import { parseVar, toDashCase } from "./lib/util";

type Intent = {
  name: string;
  utterances: any[];
  created_at: { date: string };
  updated_at: { date: string };
};

type Entity = any;
type Message = any;

const MIN_NODE_VERSION = 101600;
const numericalNodeVersion = parseInt(
  process.version
    .slice(1)
    .split(".")
    .map(seq => seq.padStart(2, "0"))
    .join(""),
  10
);

try {
  assert.strictEqual(numericalNodeVersion < MIN_NODE_VERSION, false);
} catch (_) {
  throw "node.js version must be >= 10.16.0";
}

const getIntent = (intent: Intent) => ({
  intent: toDashCase(intent.name),
  examples: intent.utterances.map(u => ({ text: u.text || "_" })),
  created: intent.created_at.date,
  updated: intent.updated_at.date,
});

const getEntities = (entity: Entity) => ({
  entity: toDashCase(entity.name),
  created: entity.created_at.date,
  updated: entity.updated_at.date,
  values: entity.data.map(({ value, synonyms }) => ({
    type: "synonyms",
    value,
    synonyms: !Array.isArray(synonyms)
      ? synonyms.map(toDashCase).split(",")
      : synonyms,
  })),
});

export const outputPath = path.join(
  process.cwd(),
  process.env.OUTPUT_DIR || "output"
);

(async () => {
  try {
    await fs.promises.access(outputPath, fs.constants.R_OK);
  } catch (_) {
    await fs.promises.mkdir(outputPath);
  }
})();

(async () => {
  try {
    const payload = await getProjectData({
      projectId: process.env.BOTMOCK_PROJECT_ID,
      boardId: process.env.BOTMOCK_BOARD_ID,
      teamId: process.env.BOTMOCK_TEAM_ID,
      token: process.env.BOTMOCK_TOKEN,
    });
    const [intents, entities, messages, project] = payload.data;
    const filepath = `${outputPath}/${toDashCase(project.name)}.json`;
    await fs.promises.writeFile(
      filepath,
      JSON.stringify(
        {
          ...JSON.parse(
            await fs.promises.readFile(`${process.cwd()}/template.json`, "utf8")
          ),
          dialog_nodes: await getDialogNodesFromMessages(
            project.platform,
            messages
          ),
          intents: intents.map(getIntent),
          entities: entities.map(getEntities),
          created: project.created_at.date,
          updated: project.updated_at.date,
          name: project.name,
        },
        null,
        2
      ) + os.EOL
    );
    const { size } = await fs.promises.stat(filepath);
    console.log(`done. ${os.EOL}wrote ${size / 1000}kB to ${filepath}.`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

async function getDialogNodesFromMessages(
  platform: string,
  messages: Message[]
): Promise<any> {
  let i;
  const nodes = [];
  const conditionsMap = {};
  const siblingMap = {};
  const provider = new Provider(platform);
  for (const message of messages) {
    // hold on to sibling nodes to define `previous_sibling` from another node.
    if (message.next_message_ids.length > 1) {
      siblingMap[message.message_id] = message.next_message_ids.map(
        m => m.message_id
      );
    }
    let previous_sibling;
    const [prev = {}] = message.previous_message_ids;
    const siblings = siblingMap[prev.message_id] || [];
    // if there is a sibling with this message id, set the previous_sibling as
    // the sibling before this one
    if ((i = siblings.findIndex(s => message.message_id === s))) {
      previous_sibling = siblings[i - 1];
    }
    // coerce types to their watson equivalents
    // see https://cloud.ibm.com/docs/services/assistant?topic=assistant-dialog-responses-json
    const generic: any = {};
    switch (message.message_type) {
      case "image":
        generic.response_type = "image";
        generic.source = message.payload.image_url;
        break;
      case "button":
      case "quick_replies":
        const transformPayload = value => ({
          label: value.title,
          value: {
            input: {
              text: value.payload,
            },
          },
        });
        generic.response_type = "option";
        generic.title = message.payload.text || "";
        generic.options = message.payload.hasOwnProperty(message.message_type)
          ? message.payload[message.message_type].map(transformPayload)
          : message.payload[`${message.message_type}s`].map(transformPayload);
        break;
      case "text":
        generic.response_type = "text";
        generic.values = [{ text: message.payload.text || "" }];
        break;
      default:
        console.warn(
          `"${message.message_type}" is an unsupported node type and will be coerced to text`
        );
        generic.response_type = "text";
        generic.values = [{ text: JSON.stringify(message.payload) }];
    }
    const [
      { message_id: nextMessageId } = { message_id: "" },
    ] = message.next_message_ids;
    nodes.push({
      output: {
        ...(platform === "slack"
          ? {
              [platform]: provider.create(
                message.message_type,
                message.payload
              ),
            }
          : {}),
        generic: [generic],
      },
      title: message.payload.nodeName
        ? toDashCase(message.payload.nodeName)
        : "welcome",
      next_step: message.next_message_ids.every(
        message => !message.action.payload
      )
        ? {
            behavior: "skip_user_input",
            selector: "body",
            dialog_node: nextMessageId,
          }
        : {
            behavior: "jump_to",
            selector: message.is_root ? "body" : "user_input",
            dialog_node: nextMessageId,
          },
      previous_sibling,
      conditions: message.is_root
        ? "welcome"
        : conditionsMap[message.message_id] || "anything_else",
      parent: prev.message_id,
      dialog_node: message.message_id,
      context: Array.isArray(message.payload.context)
        ? message.payload.context.reduce(
            (acc, k) => ({ ...acc, [parseVar(k.name)]: k.default_value }),
            {}
          )
        : {},
    });
    // maintain lookup table relating message_id -> intent incident on it
    for (const y of message.next_message_ids) {
      if (!y.action.payload) {
        continue;
      }
      conditionsMap[y.message_id] = `#${toDashCase(y.action.payload)}`;
    }
  }
  return nodes;
}
