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
    return { time: 0, typing: true };
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
    const [firstElement] = data.elements || [data];
    return {
      title: firstElement.title,
      source: firstElement.image_url,
      description: firstElement.subtitle,
    };
  }
}
