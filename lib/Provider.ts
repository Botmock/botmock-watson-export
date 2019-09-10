class Generic {
  text(data: { attachments: any[] }): any {
    return data.attachments;
  }
}

interface Payload {}

export default class Provider {
  public platform: any;
  private supportedPlatforms = ["facebook", "slack"];

  constructor(platform: string) {
    if (this.supportedPlatforms.includes(platform)) {
      const mod = require(`./${platform.replace(
        /^\w/,
        platform.substr(0, 1).toUpperCase()
      )}`);
      this.platform = new mod();
    } else {
      this.platform = new Generic();
    }
  }
  create(type: string, payload: Payload) {
    return this.platform[type](payload);
  }
}
