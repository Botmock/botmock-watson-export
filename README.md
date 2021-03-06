# Botmock Watson Export

Node.js project for importing [Botmock](https://botmock.com) projects in [Watson](https://www.ibm.com/watson)

> **Note**: The deprecated version of this exporter can be found in the `legacy` branch.

## Table of Contents

* [Overview](#overview)
  * [Usage](#usage)
  * [Caveats](#caveats)
  * [Importing](#importing)

## Overview

### Usage

> **Note**: prerequisites
> - [Node.js LTS version](https://nodejs.org/en/)

Running the following commands should allow you to generate restorable content from your Botmock project.

- `git clone git@github.com:Botmock/botmock-watson-export.git`
- `cd botmock-watson-export`
- `npm install`
- `mv ./sample.env ./.env` and edit `.env` to contain your token and project ids
- `npm start`

`./output` should be generated in your project root.

If `dialog_nodes` property is empty in the generated `.json`, this usually indicates that the original Botmock project has no "generic" content.

### Caveats

> Note that for data surrounding [slot-filling](https://cloud.ibm.com/docs/services/assistant?topic=assistant-tutorial-slots-complex) in your original project to appear available in the Watson Assistant dashboard, you must navigate to the node containing slot-filling within the **Dialog** section of the skill and click **Customize** and then turn slot-filling on. Upon doing so, you should discover your data from your original project appears automatically within the dashboard.

### Importing

- go to the [IBM dashboard](https://cloud.ibm.com/)
- click **Services**
- click on a **Watson Assistant** in the **Services**, or **Create resource** and then **Watson Assistant** and **Create** from a selected plan
- click **Launch Watson Assistant**
- click on an existing assistant, or **Create assistant**
- click on the skills icon in the left sidebar
- click **create skill**, **next**, and **import skill**
- choose the `.json` file generated by this script in `./output`
