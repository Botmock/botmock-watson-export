import { default as uuid } from "uuid/v4";

export enum MessageTypes {
  text = "text",
}

const nextMessageId = uuid();
const messageId = uuid();
const intentId = uuid();

export const variableName = "v";

export const projectData = {
  project: { platform: "generic", name: "name" },
  board: {
    board: {
      messages: [
        {
          is_root: true,
          message_id: messageId,
          message_type: MessageTypes.text,
          payload: {
            text: "",
          },
          next_message_ids: [{ message_id: nextMessageId, intent: { label: "", value: intentId }, action: "", conditional: "" }],
        },
        {
          is_root: false,
          message_id: nextMessageId,
          message_type: MessageTypes.text,
          payload: {
            text: "",
          },
          previous_message_ids: [{ message_id: messageId }],
          next_message_ids: [],
        }
      ],
      root_messages: [messageId]
    }
  },
  entities: [],
  intents: [{
    id: intentId,
    name: "",
    utterances: [
      { text: "", variables: [{ name: `%${variableName}%` }] }, { text: "_", variables: [{ name: `%${variableName}%` }] }
    ],
    created_at: {},
    updated_at: {},
    is_global: false,
    slots: [],
  }],
  variables: [],
};
