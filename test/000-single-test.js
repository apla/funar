import assert from "node:assert";

import { it, describe } from "node:test";

import { parseSource } from "../src/funar.js";

describe ("one test", () => {

	it ("http handler, jsdoc uses typedef", () => {
		const fn = `/**
 * @typedef QueryWithColor
 * @type {Object}
 * @description parsed query string
 * @prop {string} color color from query string
 */

/**
* A7B function
* @param {Object}         req         request object
* @param {QueryWithColor} req.query   parsed query string
* @param {Object}         req.headers request headers
* @param {string}         req.headers.userAgent User-Agent header
* @param {Object}         res         response object
* @param {Function}       next        call next middleware
*/
const handler = ({query: {color}, headers: {userAgent}}, res, next) => {
return displayName + ' is ' + name;
};`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		// each contract means one function
		const contract = contracts[0];

		assert ("description" in contract);

		assert (contract.description);

		assert.strictEqual (Object.keys(contract.vars).length, 4);

		assert.deepStrictEqual (contract.vars, {
			color: { name: "color", path: "0.query.color", description: "color from query string", type: "string", isOptional: false },
			userAgent: { name: "userAgent", path: "0.headers.userAgent", description: "User-Agent header", type: "string", isOptional: false },
			res:   { name: "res",   path: "1", description: "response object", type: "Object", isOptional: false },
			next:  { name: "next",  path: "2", description: "call next middleware", type: "Function", isOptional: false}
		});
	});
});