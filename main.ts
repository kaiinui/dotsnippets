import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";

interface SnippetsJson {
  [key: string]: Snippet;
}

interface Snippet {
  prefix: string;
  body: string[];
  description?: string;
}

function log(msg: string) {
  console.log(`dotsnippets: ${msg}`);
}

// TODO(kaiinui): Currently it will brake existing snippets jsons due to not reading them before process .snippets dir.
// TODO(kaiinui): No error handling about directory structure, even if given dir is not exist.
async function main() {
  await new Command()
    .name("dotsnippets")
    .description("Manage your VSCode snippets in .snippets directory.")
    .version("v0.0.1")
    .option("-d, --dir <path>", "The .snippets dir path.", {
      default: `${Deno.env.get("HOME")}/.snippets/`,
    })
    .option(
      "-i, --import",
      "Import current VSCode snippet JSONs to .snippets directory.",
    )
    .action(async (opts) => {
      if (opts.import) {
        await importSnippets(opts.dir);
      } else {
        await exportSnippets(opts.dir);
      }
    }).parse();
}

// export

async function exportSnippets(dir: string) {
  await iterateSnippetsFolder(dir);
}

async function iterateSnippetsFolder(snippetsFolderPath: string) {
  for await (const file of Deno.readDir(snippetsFolderPath)) {
    if (!file.isDirectory) {
      continue;
    }

    const json = await transformDotSnippetsDirectoryToSnippetsJson(
      `${snippetsFolderPath}/${file.name}`,
    );
    const out = JSON.stringify(json, null, 2);
    const outPath = `${getVsCodeSnippetsRootPath()}${file.name}.json`;
    await Deno.writeTextFile(outPath, out);
  }
}

async function transformDotSnippetsDirectoryToSnippetsJson(
  path: string,
): Promise<SnippetsJson> {
  const json: SnippetsJson = {};

  for await (const file of Deno.readDir(path)) {
    if (!file.isFile) {
      continue;
    }

    const prefix = prefixFromFileName(file.name);

    const body = await Deno.readTextFile(`${path}/${file.name}`);
    const bodyLines = body.split("\n");

    json[prefix] = {
      prefix: prefix,
      body: bodyLines,
    };
  }

  return json;
}

// import

interface SnippetsDirectoryDump {
  [scope: string]: SnippetsJson;
}

async function importSnippets(dir: string) {
  const out = await transformCodeSnippetsDirectory(
    getVsCodeSnippetsRootPath(),
  );
  logExportStats(out);
  await writeSnippetsDirectoryDumpToDotSnippetsDirectory(dir, out);
}

// ~Code/User/snippets/
async function transformCodeSnippetsDirectory(
  path: string,
): Promise<SnippetsDirectoryDump> {
  const directory: SnippetsDirectoryDump = {};

  for await (const jsonFile of Deno.readDir(path)) {
    if (jsonFile.isDirectory) {
      continue;
    }

    const scope = jsonFile.name.split(".")[0]; // expect typescript.js -> typescript
    directory[scope] = await transformSnippetsJsonFileToSnippetsJson(
      `${path}/${jsonFile.name}`,
    );
  }

  return directory;
}

// e.g. ~Code/User/snippets/typescript.json
async function transformSnippetsJsonFileToSnippetsJson(
  path: string,
): Promise<SnippetsJson> {
  const body = await Deno.readTextFile(path);
  return JSON.parse(body) as SnippetsJson;
}

function logExportStats(dump: SnippetsDirectoryDump) {
  const scopes = Object.keys(dump);
  for (const scope of scopes) {
    const snippetsJson = dump[scope];
    for (const prefix of Object.keys(snippetsJson)) {
      log(`writing ${prefix} (${scope})`);
    }
  }
}

async function writeSnippetsDirectoryDumpToDotSnippetsDirectory(
  dir: string,
  dump: SnippetsDirectoryDump,
) {
  for await (const scope of Object.keys(dump)) {
    const snippetsJson = dump[scope];
    for await (const prefix of Object.keys(snippetsJson)) {
      const snippet = snippetsJson[prefix];
      const dirPath = `${dir}/${scope}`;
      // FIXME(kaiinui): stop using unstable
      if (!existsSync(dirPath)) {
        await Deno.mkdir(dirPath, {
          recursive: true,
        });
      }
      await Deno.writeTextFile(
        `${dirPath}/${makeDotSnippetFileName(scope, prefix)}`,
        snippet.body.join("\n"),
      );
    }
  }
}

const scopeToShotenExtension: { [key: string]: string } = {
  javascript: "js",
  typescript: "ts",
  rust: "rs",
  python: "py",
  ruby: "rb",
  perl: "pl",
  stylesheet: "css",
  markfile: "md",
  shellscript: "sh",
  csharp: "cs",
};

function makeDotSnippetFileName(scope: string, prefix: string): string {
  const extensionOrNull = scopeToShotenExtension[scope];
  if (extensionOrNull) {
    return `${prefix}.${extensionOrNull}`;
  } else {
    return `${prefix}.${scope}`;
  }
}

// helper

function getVsCodeSnippetsRootPath(): string {
  // FIXME(kaiinui): Currently MacOS only.
  return Deno.env.get("HOME") +
    "/Library/Application Support/Code/User/snippets/";
}

function prefixFromFileName(filename: string): string {
  const fileNameComponents = filename.split(".");
  // given jest.config.default.js as file -> expect jest.config.default
  // given jest.js as file -> expect jest
  return fileNameComponents.slice(0, fileNameComponents.length - 1)
    .join(".");
}

await main();
