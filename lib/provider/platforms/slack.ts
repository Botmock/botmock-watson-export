import { MessagePayload } from "../";

export default class Slack {
  /**
   * 
   * @param data message payload
   */
  text(data: MessagePayload): object {
    return { text: data.text, attachments: data.attachments };
  }
};
