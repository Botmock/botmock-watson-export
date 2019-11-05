import { MessagePayload, Facebook } from "../";

export default class {
  /**
   * 
   * @param data message payload
   */
  text(data: MessagePayload): object {
    return {
      template_type: Facebook.TemplateTypes.generic,
      elements: [
        { title: data.text }
      ]
    };
  }
  /**
   * 
   * @param data message payload
   */
  option(data: MessagePayload): object {
    return {
      template_type: Facebook.TemplateTypes.button,
      text: data.text,
      buttons: data.buttons.map((button: any) => ({ type: button.type, url: button.payload, title: button.title, webview_height_ratio: "full" })),
    };
  }
};
