export default class Slack {
  /**
   * 
   * @param data any
   * @returns object
   */
  text(data: any): object {
    return data.attachments;
  }
};
