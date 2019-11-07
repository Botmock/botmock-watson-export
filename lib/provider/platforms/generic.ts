import { MessagePayload } from "../";

export default class Generic {
  /**
   * 
   * @param data message paylod
   */
  public text(data: MessagePayload): object {
    return {
      values: [{ text: data.text }]
    };
  }
  /**
   * 
   * @param data message paylod
   */
  public pause(data: MessagePayload): object {
    return { time: data.show_for, typing: true };
  }
  /**
   * 
   * @param data message paylod
   */
  public option(data: MessagePayload): object {
    const key = typeof data.buttons !== "undefined" ? "buttons" : "quick_replies";
    return {
      title: data.text,
      // @ts-ignore
      options: data[key].map((value: Partial<{ title: string, payload: string }>) => ({
        label: value.title,
        value: {
          input: {
            text: value.payload,
          }
        },
      }))
    };
  }
  /**
   * 
   * @param data message paylod
   */
  public image(data: MessagePayload): object {
    const [firstElement] = data.elements || [data];
    return {
      title: firstElement.title,
      source: firstElement.image_url,
      description: firstElement.subtitle,
    };
  }
}
