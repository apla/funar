#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

/** @typedef {import("../src/funar.js").FunContract} FunContract */

import { parseSource as extractContracts } from "../src/funar.js";

import { runScript, serializeContracts } from "../src/cli.js";

/**
 * Produce a CLI tool to call exported functions from an input file.
 * It's recommended to put input files into the "src" or "lib" folder,
 * and specify the output file in the "bin" folder.
 * @summary Produce a CLI tool in the output file to call exported functions from an input file.
 * @param {Object} options
 * @param {"cli"}  options.type type of output
 * @param {string} options.input input file name
 * @param {string} options.output output file name
 */
export async function gen ({type: t, type, input: i, input, output: o, output}) {

	const {contracts, exports} = await parseSourceFile(input);

	let inputRelative = path.relative(path.dirname(output), input);
	if (!inputRelative.includes(path.sep)) {
		inputRelative = `./${inputRelative}`;
	}

	const convertModuleFilename = path.resolve(import.meta.dirname, "../src/convert.js");
	const convertModuleContents = (await fs.readFile(convertModuleFilename)).toString("utf8");

	const cliModuleFilename = path.resolve(import.meta.dirname, "../src/cli.js");
	const cliModuleContents = (await fs.readFile(cliModuleFilename)).toString("utf8");

	const [cliModuleImports, ,cliModuleCode] = cliModuleContents.split("// DO NOT MODIFY: separator line for code and imports");

	// TODO: alternative node executable?
	const script = `#!/usr/bin/env node
/* Do not modify: this file is generated automatically by https://github.com/apla/funar */

${cliModuleImports.trim()}

import * as exports from '${inputRelative}';

/** @typedef {import("funar/src/funar.js").FunContract} FunContract */
/** @typedef {import("funar/src/funar.js").FunParameter} FunParameter */
/** @typedef {import("node:util").ParseArgsConfig} ParseArgsConfig */

const contracts = ${serializeContracts(contracts, exports)};

runScript({contracts, exports});

// funar/src/cli.js
${cliModuleCode.trim()}

// funar/src/convert.js
${convertModuleContents.trim()}

	`;

	await fs.writeFile(output, script, "utf8");
}

/**
 * Parse sourcefile, extract contracts and exports.
 * @param {string} sourcefile source file name
 * @returns {Promise<{contracts:FunContract[], exports:Object<string,any>}>}
 */
async function parseSourceFile (sourcefile) {
    const source = await fs.readFile(sourcefile, "utf8");
    const contracts = extractContracts(source);

    const exports = await import(path.resolve(sourcefile));

	return {contracts, exports};

}

parseSourceFile(process.argv[1]).then(runScript).then(() => {});



