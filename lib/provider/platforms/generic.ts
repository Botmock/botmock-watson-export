export default class Generic {
  /**
   * 
   * @param data message paylod
   * @returns object
   */
  text(data: any): object {
    return {
      values: [{ text: data.text, selection_policy: "sequential" }]
    };
  }
  /**
   * 
   * @param data message paylod
   * @returns object
   */
  pause(data: any): object {
    return {};
  }
  /**
   * 
   * @param data message paylod
   * @returns object
   */
  option(data: any): object {
    const key = typeof data.buttons !== "undefined" ? "buttons" : "quick_replies";
    return {
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
   * @returns object
   */
  image(data: any): object {
    return {
      title: data.title,
      source: data.image_url,
    };
  }
}
