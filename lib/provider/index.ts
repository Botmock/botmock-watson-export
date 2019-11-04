import { AbstractProject, Message } from "@botmock-api/flow";
import { default as Generic } from "./platforms/generic";
import { Watson } from "../file";

export * from "./platforms/facebook";
export * from "./platforms/slack";

export default class PlatformProvider extends AbstractProject {
  private readonly platform: any;
  /**
   * Creates new instance of PlatformProvider
   * @param platformName the name of the platform
   */
  constructor(platformName: string, projectData: any) {
    super({ projectData });
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
   * Gets responses for any messages in the same segment as a given message
   * @param message message to map responses from
   */
  private getResponsesForAllMessagesImpliedByFirstMessage(message: Message): unknown {
    return [message, ...this.gatherMessagesUpToNextIntent(message)].map(message => {
      const { message_type: contentBlockType } = message;
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
      if (!methodToCallOnClass) {
        methodToCallOnClass = "text";
      }
      return this.platform[methodToCallOnClass](message.payload);
    })
  }
  /**
   * Creates output field within a dialog node
   * @param message the first message
   * @returns response able to be mixed-in to rest of response object
   */
  public create(message: Message): Partial<{ [key: string]: any }> {
    const platfomResponse: unknown = Watson.SupportedPlatforms[this.platform]
      ? { [this.platform]: this.getResponsesForAllMessagesImpliedByFirstMessage(message) }
      : {};
    return {
      ...platfomResponse,
      selection_policy: Watson.SelectionPolicies.sequential,
      // response_type: methodToCallOnClass,
      generic: this.getResponsesForAllMessagesImpliedByFirstMessage(message),
    };
  }
}
