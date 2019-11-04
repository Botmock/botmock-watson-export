export default class Generic {
  /**
   * 
   * @param data message paylod
   * @returns object
   */
  public text(data: any): typeof data {
    return {
      values: [{ text: data.text }]
    };
  }
  /**
   * 
   * @param data message paylod
   * @returns object
   */
  public pause(data: any): typeof data {
    return {};
  }
  /**
   * 
   * @param data message paylod
   * @returns object
   */
  public option(data: any): typeof data {
    const key = typeof data.buttons !== "undefined" ? "buttons" : "quick_replies";
    return {
      title: data.text,
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
  public image(data: any): typeof data {
    return {
      title: data.title,
      source: data.image_url,
    };
  }
}
