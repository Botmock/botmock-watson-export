export type ObjectLike<T> = { [key: string]: T; };

export type Slots = ReadonlyArray<ObjectLike<string | object>>;

export type ProjectData<T> = T extends Promise<infer K> ? K : any;

export interface Config {
  readonly outputDirectory: string;
  readonly projectData: unknown;
}

export namespace Watson {
  export type DialogNodes = Partial<{
    type: string;
    title: string;
    output: { [key: string]: any; };
    parent: string;
    next_step: { [key: string]: any; };
    previous_sibling: string;
    conditions: string;
    dialog_node: string;
  }>;
  export enum SupportedPlatforms {
    slack = "slack",
    facebook = "facebook",
  }
  export enum Selectors {
    user = "user_input",
  }
  export enum Behaviors {
    jump = "jump_to",
    skip = "skip_user_input",
  }
  export enum SelectionPolicies {
    sequential = "sequential",
  }
  export enum EventNames {
    input = "input",
    focus = "focus",
  }
  export enum EntityTypes {
    synonyms = "synonyms",
  }
  export enum Conditions {
    anything = "anything_else",
  }
  export enum DialogNodeTypes {
    HANDLER = "event_handler",
    FRAME = "frame",
    SLOT = "slot",
    STANDARD = "standard",
  }
}
