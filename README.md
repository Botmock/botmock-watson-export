# Botmock Watson Export

Node.js project for importing [Botmock](https://botmock.com) projects in [Watson](https://www.ibm.com/watson)

> **Note**: The deprecated version of this exporter can be found in the `legacy` branch.

## Table of Contents

* [Overview](#overview)
  * [Usage](#usage)

## Overview

### Usage

> **Note**: prerequisites
> - [Node.js LTS version](https://nodejs.org/en/)

Running the following commands should allow you to generate restorable content from your Botmock project.

- `git clone git@github.com:Botmock/botmock-watson-export.git`
- `cd botmock-watson-export`
- `npm install`
- `mv ./sample.env ./env` and edit `.env` to contain your token and project ids
- `npm start`

`./output` should be generated in your project root.

If `dialog_nodes` property is empty in the generated `.json`, this usually indicates that the original Botmock project has no "generic" content.
