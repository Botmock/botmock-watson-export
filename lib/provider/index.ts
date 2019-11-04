import { default as Generic } from "./platforms/generic";
import { Watson } from "../file";

export * from "./platforms/facebook";
export * from "./platforms/slack";

export type MessagePayload = {};

// export type GeneratedResponse = any[];

export default class PlatformProvider {
  private readonly platform: any;
  /**
   * Creates new instance of PlatformProvider
   * @param platformName the name of the platform
   */
  constructor(platformName: string) {
    let mod: typeof Generic;
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
  public create(contentBlockType: string = "", messagePayload: MessagePayload): Partial<{ [key: string]: any }> {
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
    // const platform = this.platform.constructor.name.toLowerCase();
    if (!methodToCallOnClass) {
      methodToCallOnClass = "text";
    }
    const generatedResponse: unknown = this.platform[methodToCallOnClass](messagePayload);
    return {
      selection_policy: Watson.SelectionPolicies.sequential,
      response_type: methodToCallOnClass,
      ...generatedResponse,
    };
  }
}
