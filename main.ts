import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";

interface SnippetsJson {
  [key: string]: Snippet;
}

interface Snippet {
  prefix: string;
  body: string[];
  description?: string;
}

// TODO(kaiinui): Currently it will brake existing snippets jsons due to not reading them before process .snippets dir.
// TODO(kaiinui): No error handling about directory structure, even if given dir is not exist.
async function main() {
  await new Command()
    .name("dotsnippets")
    .description("Manage your VSCode snippets in .snippets directory.")
    .version("v0.0.1")
    .option("-d, --dir <path>", "The .snippets dir path.", {
      default: getVsCodeSnippetsRootPath(),
    })
    .action(async ({dir}) => {
      await iterateSnippetsFolder(dir);
    }).parse()
}

async function iterateSnippetsFolder(snippetsFolderPath: string) {
  for await (const file of Deno.readDir(snippetsFolderPath)) {
    if (!file.isDirectory) {
      continue;
    }

    const json = await transformSnippetsDirectoryToSnippetsJson(
      `${snippetsFolderPath}/${file.name}`,
    );
    const out = JSON.stringify(json, null, 2);
    const outPath = `${getVsCodeSnippetsRootPath()}${file.name}.json`;
    await Deno.writeTextFile(outPath, out);
  }
}

async function transformSnippetsDirectoryToSnippetsJson(
  path: string,
): Promise<SnippetsJson> {
  const json: SnippetsJson = {};

  for await (const file of Deno.readDir(path)) {
    if (!file.isFile) {
      continue;
    }

    const fileNameComponents = file.name.split(".");
    // given jest.config.default.js as file -> expect jest.config.default
    // given jest.js as file -> expect jest
    const prefix = fileNameComponents.slice(0, fileNameComponents.length - 1)
      .join(".");

    const body = await Deno.readTextFile(`${path}/${file.name}`);
    const bodyLines = body.split("\n");

    json[prefix] = {
      prefix: prefix,
      body: bodyLines,
    };
  }

  return json;
}

function getVsCodeSnippetsRootPath(): string {
  // FIXME(kaiinui): Currently MacOS only.
  return Deno.env.get("HOME") +
    "/Library/Application Support/Code/User/snippets/";
}

await main();
