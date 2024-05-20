import { format, parseArgs } from "node:util";

/** @typedef {import("../src/funar.js").FunContract} FunContract */
/** @typedef {import("../src/funar.js").FunParameter} FunParameter */
/** @typedef {import("node:util").ParseArgsConfig} ParseArgsConfig */

import { parseFloatFromString, parseBigIntFromString } from "./funar.js";

/**
 * Converts a contract object into an array of options objects.
 *
 * @param {FunContract} contract - The contract object to be converted.
 * @return {{argParserOpts: ParseArgsConfig, argPlacement: Object<string,FunParameter>}} An array of options objects, each containing the name, type, and description of a variable.
 */
export function convertContractToOptions(contract) {
    /** @type {ParseArgsConfig} */
    const argParserOpts = {options: {}};
    const options = argParserOpts.options;

	/** @type {Object<string,FunParameter>} */
    const argPlacement = {};

    for (const [name, varMeta] of Object.entries(contract.vars)) {
        if (varMeta.type === undefined) continue;
        /** @satisfies {"string"|"boolean"} */
        let type;
        if (varMeta.structure && varMeta.contains) {
            type = varMeta.contains === "boolean" ? "boolean" : "string";
        } else {
            type = varMeta.type === "boolean" ? "boolean" : "string";
        }

        const option = {
            type,

			// no need to set default. reasons:
			// 1: type can be only string or boolean, so we need to parse and adopt type anyway
			// 2: we will check the value before running our handler, defaults will mess things up a lot
            // default: varMeta.default,
        };
		if (varMeta.structure === "array") {
			option.array = true;
		} else if (varMeta.structure === "enum") {
			option.type = "string";
		} else if (varMeta.structure === "object") {
			// TODO: what to do?
		}
		if (varMeta.alias) {
			option.short = varMeta.alias;
		}

        argPlacement[name] = varMeta;

		// @ts-ignore
        options[name] = option;
    }

    return {argParserOpts, argPlacement};
}

/**
 * @callback FillDataFunction
 * @param {Object<string,any>} obj data to fill
 * @returns {Array<Object<string,any>>} to indicate success or failure
 */

/**
 * Creates an object mapper function that takes an object and maps its properties
 * to an array of arguments based on a argument placement template.
 *
 * @param {Object<string,FunParameter>} template - The template object that defines the mapping between object properties and array indices.
 * @return {FillDataFunction} The object mapper function that takes an object and returns an array of arguments.
 */
export function createObjectMapper(template) {

	return function(obj) {
		const args = [];

		Object.entries(template).map(([varName, {path, type, isOptional}]) => {
			const [argIndexStr, ...pathChunks] = path.split('.');

			const argIndex = parseInt(argIndexStr, 10);

			if (!pathChunks.length) {
				args[argIndex] = obj[varName];
				return;
			}

			let targetObj = args[argIndex] = args[argIndex] ?? {};

			// lastChunk is not undefined because pathChunks is not empty
			/** @type {string} */ // @ts-ignore
			const lastChunk = pathChunks.pop();

			for (let pathChunk in pathChunks) {
				if (targetObj[pathChunk] === undefined) {
					targetObj[pathChunk] = {};
				}
				targetObj = targetObj[pathChunk];
			}

			// TODO: arrays, objects, enums
			// ensure param is provided unless it is optional
			if (!isOptional && !obj[varName]) {
				throw new Error(format("Missing required parameter: %s", varName));
			}

			targetObj[lastChunk] = obj[varName];

			// params can be bool or string, we need to parse param value for integers/numbers
			if (type === "number") {
				targetObj[lastChunk] = parseFloatFromString(obj[varName]);
				if (targetObj[lastChunk] === undefined)
					throw new Error(format("Error parsing parameter '%s', expected type is '%s'", varName, type));
			} else if (type === "bigint") {
				targetObj[lastChunk] = parseBigIntFromString(obj[varName]);
				if (targetObj[lastChunk] === undefined)
					throw new Error(format("Error parsing parameter '%s', expected type is '%s'", varName, type));
			}

			// TODO: validating param value

	  	});

		return args;
	};
}

/**
 * Executes a function with the provided contract.
 *
 * @param {Function} fn - The function to be executed.
 * @param {FunContract} contract - The contract object containing the necessary information for executing the function.
 * @return {void} This function does not return a value.
 */
export function executeFunction (fn, contract) {

	const connectOptions = convertContractToOptions(contract);

	// TODO: add -h/--help and -v/--version automatically
	// TODO: build usage on error from contract variables

	let usageAfterError = generateUsage(contract);

	try {
		const { values: parsedVariables, positionals } = parseArgs({
			options: connectOptions.argParserOpts.options,
			strict: true,
			allowPositionals: true,
		});

		const mapper = createObjectMapper(connectOptions.argPlacement);

		const args = mapper(parsedVariables);

		// we successfully checked all required parameters, no need to display usage
		usageAfterError = "";
		fn.apply(null, args);
	} catch (err) {
		console.error(err.message);
		if (usageAfterError)
			console.error(usageAfterError);
		process.exit(1);
	}

	process.exit(0);

}

/**
 *
 * @param {FunContract} contract
 */
export function generateUsage(contract) {

	/** @type {Array<[string,string]>} */
	const required = [];
	/** @type {Array<[string,string]>} */
	const optional = [];
	let leftColWidth = 0;

	for (const [name, varMeta] of Object.entries(contract.vars)) {
		if (varMeta.type === undefined) continue;
		const optionType = varMeta.type === "boolean" ? "" : `=<${varMeta.type}>`;
		const optionName = `  ${varMeta.alias ? `-${varMeta.alias}, ` : ""}--${name}${optionType}`;

		leftColWidth = Math.max(leftColWidth, optionName.length);

		/** @type {[string, string]} */
		const option = [optionName, `${varMeta.description}${varMeta.default ? ` (default: "${varMeta.default}")` : ""}`];
		if (varMeta.isOptional) {
			optional.push(option);
		} else {
			required.push(option);
		}
	}

	function mapOption ([optionName, description]) {
		return `${optionName.padEnd(leftColWidth)}  ${description}`;
	}

	const usage = [
		`${contract.description}`,
		`Usage: ${contract.name} [options]`,
		...(required.length ? [`Required:`] : []),
		...required.map(mapOption),
		...(optional.length ? [`Optional:`] : []),
		...optional.map(mapOption),
	];

	return usage.join("\n");
}

/**
 * Generates a list of commands from the provided contracts and sorts them alphabetically.
 *
 * @param {FunContract[]} contracts - An array of contract objects containing the commands.
 * @return {string} A formatted string of sorted commands.
 */
function generateCommandListUsage(contracts, exports) {
	let leftColWidth = 0;

	const exportedContracts = contracts.filter(contract => contract.name in exports);

	for (const cIdx in exportedContracts) {
		const contract = exportedContracts[cIdx];
		leftColWidth = Math.max(leftColWidth, contract.name.length);
	}

	const commands = exportedContracts.map(contract => {
		return `${contract.name.padEnd(leftColWidth)}  ${contract.description}`;
	}).sort();

	return [
		"Available commands:",
		...commands
	].join("\n");
}
