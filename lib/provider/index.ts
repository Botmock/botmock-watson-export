export * from "./platforms/facebook";
export * from "./platforms/slack";

export type MessagePayload = {};

export type Response = {};

export default class PlatformProvider {
  private readonly platform: any;
  /**
   * Creates new instance of PlatformProvider
   * @param platformName the name of the platform
   */
  constructor(platformName: string) {
    let mod: any;
    let platform = platformName;
    try {
      mod = require(`./platforms/${platform}`).default;
    } catch (_) {
      mod = require("./platforms/generic").default;
    }
    this.platform = new mod();
  }
  /**
   * Creates json containing platform-specific data
   * @param contentBlockType the message type
   * @param messagePayload the payload of the message
   * @returns response able to be mixed-in to rest of response object
   */
  create(contentBlockType: string = "", messagePayload: MessagePayload): Partial<Response> {
    let methodToCallOnClass: string;
    switch (contentBlockType) {
      case "api":
      case "jump":
        methodToCallOnClass = undefined;
        break;
      case "delay":
        methodToCallOnClass = "pause";
        break;
      case "quick_replies":
      case "button":
        methodToCallOnClass = "option";
        break;
      default:
        methodToCallOnClass = Object.getOwnPropertyNames(
          Object.getPrototypeOf(this.platform)).find(prop => contentBlockType.includes(prop)
        );
    }
    const platform = this.platform.constructor.name.toLowerCase();
    if (!methodToCallOnClass) {
      return {};
    }
    const generatedResponse: any = this.platform[methodToCallOnClass](messagePayload);
    return {
      [platform]: generatedResponse,
      generic: generatedResponse,
    };
  }
}
