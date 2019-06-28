# Botmock IBM Watson Export Script

Script to transform a [Botmock](https://botmock.com) project into a `.json` file that's importable as a Watson Assistant skill.

- Tutorial Video (Coming Soon)
- Documentation (Coming Soon)
- [Support Email](mailto:help@botmock.com)

## Prerequisites

- [Node.js](https://nodejs.org/en/) >= 10.15.x

```shell
node --version
```

## Guide

### Setup

- Clone this repo by running `git clone git@github.com:Botmock/botmock-watson-export.git`

- Run `npm install`

- Create a `.env` file with the following variables (and your values filled in):

```console
BOTMOCK_TOKEN=""
BOTMOCK_TEAM_ID=""
BOTMOCK_PROJECT_ID=""
BOTMOCK_BOARD_ID=""
```

- Run `npm start`

- Find generated JSON in `./out`

The generated `.json` file should look something like:

```json
{
  "name": "project",
  "intents": [],
  "entities": [],
  "language": "en",
  "metadata": {},
  "description": "",
  "dialog_nodes": [],
  "workspace_id": "",
  "counterexamples": [],
  "learning_opt_out": false,
  "status": "Non Existent"
}
```

### Importing into Watson

- Visit your [IBM dashboard](https://cloud.ibm.com)

- If you have preexisting Services in your Resource summary, choose them

- Otherwise, **Create resource** and choose Watson Assistant under 'AI'

- Find your Assistant service; then **Launch tool**

- Choose the 'Skills' tab and **Create new**

- Choose **Import skill**, and choose the previously generated `.json` file

## Want to help?

Found bugs or have some ideas to improve this plugin? We'd love to to hear from you! You can start by submitting an issue at the [Issues](https://github.com/Botmock/botmock-watson-export/issues) tab. If you want, feel free to submit a pull request and propose a change as well!

### Submitting a Pull Request

1. Adding a Pull Request
2. Start with creating an issue if possible, the more information, the better!
3. Fork the Repository
4. Make a new change under a branch based on master. Ideally, the branch should be based on the issue you made such as issue-530
5. Send the Pull Request, followed by a brief description of the changes you've made. Reference the issue.

_NOTE: Make sure to leave any sensitive information out of an issue when reporting a bug with imagery or copying and pasting error data. We want to make sure all your info is safe!_

## License

Botmock Watson Export is copyright © 2019 Botmock. It is free software, and may be redistributed under the terms specified in the LICENSE file.
