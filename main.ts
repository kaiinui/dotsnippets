import { parse } from "https://deno.land/std@0.175.0/flags/mod.ts";

interface SnippetsJson {
    [key: string]: Snippet
}

interface Snippet {
    prefix: string;
    body: string[];
    description?: string;
}

// TODO(kaiinui): Currently it will brake existing snippets jsons due to not reading them before process .snippets dir.
// TODO(kaiinui): No error handling about directory structure, even if given dir is not exist.
async function main() {
    const opts = parse(Deno.args, {
        string: ["dir"]
    });
    const dir = opts.dir;

    const path = dir ? dir : Deno.env.get("HOME") + "/.snippets/";
    await iterateSnippetsFolder(path);
}

async function iterateSnippetsFolder(snippetsFolderPath: string) {
    for await (const file of Deno.readDir(snippetsFolderPath)) {
        if (!file.isDirectory) {
            continue;
        }

        const json = await transformSnippetsDirectoryToSnippetsJson(`${snippetsFolderPath}/${file.name}`);
        const out = JSON.stringify(json, null, 2);
        const outPath = `${getVsCodeSnippetsRootPath()}${file.name}.json`
        await Deno.writeTextFile(outPath, out);
    }
}

async function transformSnippetsDirectoryToSnippetsJson(path: string): Promise<SnippetsJson> {
    const json: SnippetsJson = {};

    for await (const file of Deno.readDir(path)) {
        if (!file.isFile) {
            continue;
        }
        
        const fileNameComponents = file.name.split(".");
        // given jest.config.default.js as file -> expect jest.config.default
        // given jest.js as file -> expect jest
        const prefix = fileNameComponents.slice(0, fileNameComponents.length - 1).join(".");

        const body = await Deno.readTextFile(`${path}/${file.name}`);
        const bodyLines = body.split("\n");

        json[prefix] = {
            prefix: prefix,
            body: bodyLines,
        }
    }    

    return json
}

function getVsCodeSnippetsRootPath(): string {
    // FIXME(kaiinui): Currently MacOS only.
    return Deno.env.get("HOME") + "/Library/Application Support/Code/User/snippets/"
}

await main();