# Botmock IBM Watson Export Script

[![Build Status](https://dev.azure.com/botmock/botmock-watson-export/_apis/build/status/Botmock.botmock-watson-export?branchName=master)](https://dev.azure.com/botmock/botmock-watson-export/_build/latest?definitionId=5&branchName=master)

> Create IBM Watson [skills]() from Botmock projects

This script produces a `.json` file able to be imported as a skill in the IBM Watson Assistant dashboard.

## Table of Contents

* [Overview](#overview)
  * [Botmock project structure](#botmock-project-structure)
  * [Approach to importing](#approach-to-importing)
  * [Prerequisites](#prerequisites)
    * [nodejs](#nodejs)
    * [watson](#watson)
  * [Installation](#installation)
    * [clone](#clone)
    * [env](#env)
  * [Commands](#commands)
    * [start](#start)
    <!-- * [csv](#csv) -->
    <!-- * [report](#report) -->
  * [Importing](#importing)
    * [skill](#skill)

## Overview

### Botmock project structure

### Approach to importing

### Prerequisites

#### NodeJS

- [NodeJS](https://nodejs.org/en/) Version 12.x

```shell
# check node version
node --version
```

#### Watson

- [IBM Watson]() account

### Installation

#### Clone

Clone this repository and install dependencies:

```shell
git clone git@github.com:Botmock/botmock-watson-export.git

cd botmock-watson-export

npm i
```

#### Env

Create `.env` in `/botmock-watson-export` and fill in values for the following:

```shell
BOTMOCK_TOKEN=@botmock-token
BOTMOCK_TEAM_ID=@botmock-team-id
BOTMOCK_BOARD_ID=@botmock-board-id
BOTMOCK_PROJECT_ID=@botmock-project-id
```

To get your Botmock API token, follow the [guide](http://help.botmock.com/en/articles/2334581-developer-api).

### Commands

#### `start`

Populates `/output` with `.json` files produced from your original project.

```shell
npm start
```

<!-- #### `csv`

Intents can be [uploaded in bulk](https://cloud.ibm.com/docs/services/assistant?topic=assistant-intents#intents-import) to Watson Assistant.

```shell
# create a .csv file from your project's intents and utterances
npm run csv
```

#### `report` -->

### Importing

<!-- Once `npm start` is successfully run, `output/your-project-name.json` should be able to be imported. -->
