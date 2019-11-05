export default class Slack {
  /**
   * 
   * @param data message payload
   */
  text(data: any): typeof data {
    return { text: data.text, attachments: data.attachments };
  }
};
