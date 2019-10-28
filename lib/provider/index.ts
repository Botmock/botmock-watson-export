export * from "./platforms/facebook";
export * from "./platforms/slack";

export type MessagePayload = {};

export default class PlatformProvider {
  static googlePlatformName = "google";
  private readonly platform: any;
  /**
   * Creates new instance of PlatformProvider
   * @param platformName string
   */
  constructor(platformName: string) {
    let mod: any;
    let platform = platformName;
    const { googlePlatformName } = PlatformProvider;
    if (platformName.startsWith(googlePlatformName)) {
      platform = googlePlatformName;
    }
    try {
      mod = require(`./platforms/${platform}`).default;
    } catch (_) {
      mod = require("./platforms/generic").default;
    }
    this.platform = new mod();
  }
  /**
   * Creates json containing platform-specific data
   * @param contentBlockType string
   * @param messagePayload MessagePayload
   * @returns object
   */
  create(contentBlockType: string = "", messagePayload: MessagePayload): object {
    let methodToCallOnClass: string;
    switch (contentBlockType) {
      case "api":
      case "jump":
      case "delay":
        methodToCallOnClass = undefined;
        break;
      case "button":
        methodToCallOnClass = "quick_replies";
      case "generic":
        methodToCallOnClass = "card";
        break;
      case "carousel":
        methodToCallOnClass = "list";
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
    const { googlePlatformName } = PlatformProvider;
    return {
      ...generatedResponse,
      ...(platform !== googlePlatformName ? {} : {}),
    };
  }
}
