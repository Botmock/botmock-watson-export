import { Facebook } from "../";

export default class {
  /**
   * 
   * @param data any
   * @returns object
   */
  text(data: any): typeof data {
    return {
      template_type: Facebook.TemplateTypes.generic,
      elements: [
        { title: data.text }
      ]
    };
  }
  /**
   * 
   * @param data any
   * @returns object
   */
  option(data: any): typeof data {
    return {
      template_type: Facebook.TemplateTypes.button,
      text: data.text,
      buttons: data.buttons.map((button: any) => ({ type: button.type, url: button.payload, title: button.title, webview_height_ratio: "full" })),
    };
  }
};
