import assert from "node:assert";

import { it, describe } from "node:test";

import { parseSource } from "../funar.js";

describe ("contracts from function", () => {

	it ("without description", () => {
		const fn = `function a1 (a, b) {}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, "a1");
	});

	it ("with description", () => {
		const fn = `/**\n * A2 function\n */\nfunction a2 (a, b) {}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, "a2");

		assert ("description" in contract);

		assert (contract.description);
	});

	it ("with param descriptions", () => {
		const fn = `
/**
 * A2 function
 * @param {string} a the a string
 * @param {number} b the b number
 * @param {number} rest rest of arguments
*/
function a2 (a, b, ...rest) {}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, "a2");

		assert ("description" in contract);

		assert (contract.description);

		assert.strictEqual (Object.keys(contract.vars).length, 3);

		const aParam = contract.vars["a"];
		
		assert.strictEqual (aParam.type, "string");
		assert.strictEqual (aParam.description, "the a string");

		const bParam = contract.vars["b"];

		assert.strictEqual (bParam.type, "number");
		assert.strictEqual (bParam.description, "the b number");

	});


	it ("with description and params object", () => {
		const fn = `/**\n * A3 function\n */\nfunction a3 ({a, b}) {}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, "a3");

		assert ("description" in contract);

		assert (contract.description);

	});

	it ("with params object w/default", () => {
		const fn = `/**\n * A4 function\n */\nfunction a4 ({a, b} = {}) {}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, "a4");

		assert ("description" in contract);

		assert (contract.description);

		assert.strictEqual (Object.keys(contract.vars).length, 2);

		assert.deepStrictEqual (contract.vars, {
			a: {name: "a", path: "0.a"},
			b: {name: "b", path: "0.b"},
		});
	});

	it ("with params object and rename", () => {
		const fn = `/**\n * A5 function\n */\nfunction a5 ({aKey: aVar, bKey: bVar}) {}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, "a5");

		assert ("description" in contract);

		assert (contract.description);

		assert.strictEqual (Object.keys(contract.vars).length, 2);

		assert.deepStrictEqual (contract.vars, {
			aVar: {name: "aVar", path: "0.aKey"},
			bVar: {name: "bVar", path: "0.bKey"},
		});
	});


	it ("with deep params object", () => {
		const fn = `/**
* A6 function
* @param {Object} params parameters
* @param {Object} params.app application data
* @param {Object} params.query parsed query strings
* @param {Object} params.query.color color from query string
* @param {Object} params.query.color.rgb color rgb part
* @param {Object} [params.query.color.alpha] color alpha part
*/
function a6 ({path, app: {scope: apiScope = 'global', method: apiMethod}, query: {color: {rgb, alpha}}}) {
return displayName + ' is ' + name;
}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		// each contract means one function
		const contract = contracts[0];

		assert.strictEqual (contract.name, "a6");

		assert ("description" in contract);

		assert (contract.description);

		assert.strictEqual (Object.keys(contract.vars).length, 5);

		assert.deepStrictEqual (contract.vars, {
			path:      { name: "path",      path: "0.path" },
			apiScope:  { name: "apiScope",  path: "0.app.scope", default: "global", isOptional: true, alias: undefined },
			apiMethod: { name: "apiMethod", path: "0.app.method" },
			rgb:       { name: "rgb",       path: "0.query.color.rgb", description: "color rgb part", type: "Object", isOptional: false },
			alpha:     { name: "alpha",     path: "0.query.color.alpha", description: "color alpha part", type: "Object", isOptional: true }
		});
	});

	it ("in http handler", () => {
		const fn = `/**
* A7 function
* @param {Object} req request object
* @param {Object} req.query 
* @param {Object} req.query parsed query string
* @param {string} req.query.color color from query string
* @param {Object} res response object
* @param {Function} next call next middleware
*/
export const handler = ({query: {color}}, res, next) => {
	return 'color is ' + color;
};`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		// each contract means one function
		const contract = contracts[0];

		assert ("description" in contract);

		assert (contract.description);

		assert.strictEqual (Object.keys(contract.vars).length, 3);

		assert.deepStrictEqual (contract.vars, {
			color: { name: "color", path: "0.query.color", description: "color from query string", type: "string", isOptional: false },
			res:   { name: "res",   path: "1", description: "response object", type: "Object", isOptional: false },
			next:  { name: "next",  path: "2", description: "call next middleware", type: "Function", isOptional: false}
		});
	});

	it ("in http handler, jsdoc between params", () => {
		const fn = `/**
* A7A function
* @param {Object} req request object
* @param {Object} req.query 
* @param {Object} req.query parsed query string
* @param {string} req.query.color color from query string
* @param {Object} res response object
* @param {Function} next call next middleware
*/
function handler ({query: {color}}, res, next) {
return 'color is ' + color;
}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		// each contract means one function
		const contract = contracts[0];

		assert ("description" in contract);

		assert (contract.description);

		assert.strictEqual (Object.keys(contract.vars).length, 3);

		assert.deepStrictEqual (contract.vars, {
			color: { name: "color", path: "0.query.color", description: "color from query string", type: "string", isOptional: false },
			res:   { name: "res",   path: "1", description: "response object", type: "Object", isOptional: false },
			next:  { name: "next",  path: "2", description: "call next middleware", type: "Function", isOptional: false}
		});
	});

	it ("http handler, jsdoc uses typedef", () => {
		const fn = `/**
 * @typedef ColorHex
 * @type {string}
 * @description RGB Color in hex
 * @range 6
 */

/**
 * @typedef QueryWithColor
 * @type {Object}
 * @description parsed query string
 * @prop {ColorHex} color color from query string
 */

/**
 * A7B function
 * @param {Object} req request object
 * @param {QueryWithColor} req.query parsed query string
 * @param {Object} res response object
 * @param {Function} next call next middleware
 */
const handler = ({query: {color}}, res, next) => {
return 'color is ' + color;
};`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		// each contract means one function
		const contract = contracts[0];

		assert ("description" in contract);

		assert (contract.description);

		assert.strictEqual (Object.keys(contract.vars).length, 3);

		assert.deepStrictEqual (contract.vars, {
			color: { name: "color", path: "0.query.color", description: "color from query string", type: "string", isOptional: false },
			res:   { name: "res",   path: "1", description: "response object", type: "Object", isOptional: false },
			next:  { name: "next",  path: "2", description: "call next middleware", type: "Function", isOptional: false}
		});
	});

	it ("with param object descriptions", () => {
		const fn = `
/**
 * A8 function
 * @param {Object} options
 * @param {string} options.a the a string
 * @param {number} options.b the b number
 * @param {Object} flags
 * @param {boolean} flags.c the c flag
 * @param {boolean} flags.d the d flag
 * @param {callback} cb the callback
*/
function a8 ({a: varA, b}, {c, d}, cb) {}`;
		const contracts = parseSource (fn, {ast: true, jsdoc: true});

		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, "a8");

		assert ("description" in contract);

		assert (contract.description);

		assert.strictEqual (Object.keys(contract.vars).length, 5);

		const aParam = contract.vars["varA"];
		
		assert.strictEqual (aParam.type, "string");
		assert.strictEqual (aParam.description, "the a string");

		const bParam = contract.vars["b"];

		assert.strictEqual (bParam.type, "number");
		assert.strictEqual (bParam.description, "the b number");

	});

	// the syntax below is perfectly fine from JS point of view,
	// but it is not supported not by TypeScript, not by JSDoc.
	it.skip ("with destructuring by string key", () => {
		const fn = `/**
	* A9 function
	* @param {Object} req request object
	* @param {Object} req.headers request headers
	* @param {string} req.headers.userAgent User-Agent header
	* @param {Object} req.query parsed query string
	* @param {Object} res response object
	* @param {Function} next call next middleware
	*/
	const handler = ({headers: {"user-agent": userAgent}, query}, res, next) => {
	return userAgent;
	};`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);
	
		// each contract means one function
		const contract = contracts[0];
	
		assert("description" in contract);
	
		assert(contract.description);
	
		assert.strictEqual(Object.keys(contract.vars).length, 4);
	
		assert.deepStrictEqual(contract.vars.userAgent, { name: "userAgent", path: "0.headers.user-agent", description: "User-Agent header", type: "string", isOptional: false,});
		assert.deepStrictEqual(contract.vars.query, { name: "query", path: "0.query", description: "parsed query string", type: "Object", isOptional: false,});
		assert.deepStrictEqual(contract.vars.res, { name: "res",   path: "1", description: "response object", type: "Object", isOptional: false,}); 
		assert.deepStrictEqual(contract.vars.next, { name: "next",  path: "2", description: "call next middleware", type: "Function", isOptional: false,});

	});
	
	it("with arrays", () => {
		const fn = `
/**
 * AA function
 * @param {Object} options
 * @param {string[]} options.paths paths to inspect
*/
function aa ({paths}) {}`;
		const contracts = parseSource (fn, {ast: true, jsdoc: true});

		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, "aa");

		assert.strictEqual (Object.keys(contract.vars).length, 1);

		const pathsParam = contract.vars.paths;
		
		assert.strictEqual (pathsParam.type, "string[]");
		assert.strictEqual (pathsParam.description, "paths to inspect");
		assert.strictEqual (pathsParam.structure, "array");
		assert.strictEqual (pathsParam.contains, "string");

	});

});

