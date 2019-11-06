import { AbstractProject, Message } from "@botmock-api/flow";
import { default as Generic } from "./platforms/generic";
import { Watson } from "../file";

export * from "./platforms/facebook";
export * from "./platforms/slack";

export type MessagePayload = Partial<{
  text: string;
  buttons: any[];
  show_for: number;
  elements: any[];
  attachments: any[];
}>;

export type CollectedResponseObject = {
  readonly platformResponses: any[];
  readonly genericResponses: any[];
};

export namespace Facebook {
  export enum MessageTypes {
    template = "template",
  }
  export enum TemplateTypes {
    button = "button",
    generic = "generic",
  }
  export enum Ratios {
    full = "full",
  }
}

export namespace Slack {
  export enum Colorbars {
    default = "#2C3743",
  }
}

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
  private getResponsesForAllMessagesImpliedByFirstMessage(message: Message): any {
    return [message, ...this.gatherMessagesUpToNextIntent(message)]
      .map(message => {
        const { message_type: contentBlockType } = message;
        let methodToCallOnClass: string | void;
        switch (contentBlockType) {
          case "api":
          case "jump":
            methodToCallOnClass = undefined;
            break;
          case "delay":
            methodToCallOnClass = "pause";
            break;
          case "generic":
            methodToCallOnClass = "image";
            break;
          case "quick_replies":
          case "button":
            methodToCallOnClass = "option";
            break;
          default:
            methodToCallOnClass = Object.getOwnPropertyNames(
              // @ts-ignore
              Object.getPrototypeOf(this.platform)).find(prop => contentBlockType.includes(prop)
            ) as string;
        }
        if (!methodToCallOnClass) {
          methodToCallOnClass = "text";
        }
        const genericInstance = new Generic();
        return {
          platformResponse: {
            ...this.platform[methodToCallOnClass](message.payload),
            response_type: methodToCallOnClass,
            selection_policy: Watson.SelectionPolicies.sequential,
          },
          genericResponse: {
            // @ts-ignore
            ...genericInstance[methodToCallOnClass](message.payload),
            response_type: methodToCallOnClass,
            selection_policy: Watson.SelectionPolicies.sequential,
          }
        };
      })
      // @ts-ignore
      .reduce((acc, { platformResponse, genericResponse }) => {
        return {
          platformResponses: [...acc.platformResponses, platformResponse],
          genericResponses: [...acc.genericResponses, genericResponse],
        };
      }, { platformResponses: [], genericResponses: [] });
  }
  /**
   * Creates output field within a dialog node
   * @param message the first message
   * @returns response able to be mixed-in to rest of response object
   */
  public create(message: Message): Partial<{ [key: string]: any }> {
    const { platformResponses, genericResponses }: CollectedResponseObject = this.getResponsesForAllMessagesImpliedByFirstMessage(message);
    const platformSpecificResponse: { [key: string]: any } = {};
    switch (this.platform) {
      case Watson.SupportedPlatforms.slack:
        platformSpecificResponse.slack = platformResponses;
        platformSpecificResponse.colorbar = Slack.Colorbars.default;
        platformSpecificResponse.pretext = "";
        break;
      case Watson.SupportedPlatforms.facebook:
        platformSpecificResponse.message.attachment = {
          type: Facebook.MessageTypes.template,
          payload: platformResponses,
        };
        break;
    }
    return {
      ...platformSpecificResponse,
      selection_policy: Watson.SelectionPolicies.sequential,
      // response_type: methodToCallOnClass,
      generic: genericResponses,
    };
  }
}
