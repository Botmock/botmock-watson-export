# Botmock IBM Watson Export Script

import [Botmock](https://botmock.com) projects as Watson Assistant skills

- Tutorial Video (Coming Soon)
- Documentation (Coming Soon)
- [Support Email](mailto:help@botmock.com)

## Prerequisites

- [Node.js](https://nodejs.org/en/) >= 10.16.x

```shell
node --version
```

## Guide

### Setup

- Clone this repo by running `git clone git@github.com:Botmock/botmock-watson-export.git`

- Run `npm install`.

- Create a `.env` file with the following variables (and your values filled in):

```console
BOTMOCK_TOKEN=@botmock-token
BOTMOCK_TEAM_ID=@botmock-team-id
BOTMOCK_PROJECT_ID=@botmock-project-id
BOTMOCK_BOARD_ID=@botmock-board-id
```

- Run `npm start`.

- Find generated JSON in `./output`.

The generated `.json` file should look something like:

```json
{
  "name": "directions",
  "intents": [
    {
      "intent": "hi",
      "examples": [
        {
          "text": "hi!"
        },
        {
          "text": "hello!"
        }
      ],
      "created": "2019-05-31 15:40:24.000000",
      "updated": "2019-05-31 15:40:24.000000"
    }
  ],
  "entities": [],
  "language": "en",
  "metadata": {},
  "description": "",
  "dialog_nodes": [
    {
      "output": {
        "generic": [
          {
            "response_type": "text",
            "values": [
              {
                "text": "(This is the end.)"
              }
            ]
          }
        ]
      },
      "title": "end",
      "next_step": {
        "behavior": "skip_user_input",
        "selector": "body",
        "dialog_node": ""
      },
      "conditions": "anything_else",
      "parent": "8d50be9e-de4d-4870-91c4-7292ba2b4a73",
      "dialog_node": "3c8b34da-1a37-47f7-9116-5cb044048616",
      "context": {}
    }
  ],
  "workspace_id": "",
  "counterexamples": [],
  "learning_opt_out": false,
  "status": "Non Existent",
  "created": "2019-05-29 19:06:45.000000",
  "updated": "2019-07-09 17:53:32.000000"
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

Found bugs or have some ideas to improve this repo? We'd love to to hear from you! You can start by submitting an issue at the [Issues](https://github.com/Botmock/botmock-watson-export/issues) tab. If you want, feel free to submit a pull request and propose a change as well!

### Submitting a Pull Request

1. Create an issue. The more information, the better!
2. Fork the Repository.
3. Make a new change under a branch based on master.
4. Make a Pull Request with a brief description of the changes you've made. Reference the issue.

_NOTE: Make sure to leave any sensitive information out of an issue when reporting a bug with imagery or copying and pasting error data. We want to make sure all your info is safe!_

## License

Botmock Watson Export is copyright © 2019 Botmock. It is free software, and may be redistributed under the terms specified in the LICENSE file.
