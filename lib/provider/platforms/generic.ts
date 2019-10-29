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
  image(data: any): object {
    // console.log(data);
    return {
      title: data.title,
      source: data.image_url,
      description: "",
    };
  }
}
