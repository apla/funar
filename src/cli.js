/** @typedef {import("../src/funar.js").FunContract} FunContract */
/** @typedef {import("node:util").ParseArgsConfig} ParseArgsConfig */

/**
 * Converts a contract object into an array of options objects.
 *
 * @param {FunContract} contract - The contract object to be converted.
 * @return {{argParserOpts: ParseArgsConfig, argPlacement: Object<string,string>}} An array of options objects, each containing the name, type, and description of a variable.
 */
export function convertContractToOptions(contract) {
    /** @type {ParseArgsConfig} */
    const argParserOpts = {options: {}};
    const options = argParserOpts.options;

	/** @type {Object<string,string>} */
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
            multiple: varMeta.structure === "array",
            short: varMeta.alias,
            default: varMeta.default,
        };

        argPlacement[name] = varMeta.path;

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
 * @param {Object<string,string>} template - The template object that defines the mapping between object properties and array indices.
 * @return {FillDataFunction} The object mapper function that takes an object and returns an array of arguments.
 */
export function createObjectMapper(template) {

	return function(obj) {
		const args = [];

		Object.entries(template).map(([varName, value]) => {
			const [argIndexStr, ...pathChunks] = value.split('.');

			const argIndex = parseInt(argIndexStr, 10);

			if (!pathChunks.length) {
				args[argIndex] = obj[varName];
				return;
			}

			let targetObj = args[argIndex] = args[argIndex] ?? {};

			const lastChunk = pathChunks.pop();

			for (let pathChunk in pathChunks) {
				if (targetObj[pathChunk] === undefined) {
					targetObj[pathChunk] = {};
				}
				targetObj = targetObj[pathChunk];
			}

			// @ts-ignore lastChunk is not undefined because pathChunks is not empty
			targetObj[lastChunk] = obj[varName];

	  	});

		return args;
	};
}
