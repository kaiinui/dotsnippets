dotsnippets
---

`dotsnippets` allows you to manage your VSCode snippets in `.snippets` directory.

## Usage

`dotsnippets`

(optionally you can add `--dir` option to bring another snippets directory.)

This command assumes you have the following directory structure.

```
$HOME
└.snippets
 └typescript
  └some-nice-prefix.ts
 └javascript
  └some-nice-prefix.js
 └python
  ...
```

It will produce VSCode snippets JSONs and write them into the VSCode snippets directory.

```json
{
  "xo-config.default": {
    "prefix": "xo-config.default",
    "body": [
      "module.exports = {",
      "    rules: {",
      "        \"import/extensions\": \"off\",",
      "    }",
      "}"
    ]
  },
  "jest.config.default": {
    "prefix": "jest.config.default",
    "body": [
      "/** @type {import('ts-jest').JestConfigWithTsJest} */",
      "const config = {",
      "\tpreset: 'ts-jest',",
      "\ttestEnvironment: 'node',",
      "};",
      "export default config;",
      ""
    ]
  }
}
```

You can use the snippets as follows.

![](https://raw.githubusercontent.com/kaiinui/dotsnippets/main/public/readme-snippet.png)