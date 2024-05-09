import fs from "node:fs";

import assert from "node:assert";

import { it, describe, before } from "node:test";

import { parseSource } from "../src/funar.js";

/** @type {Buffer} */
let contents;
/** @type {import("../funar.js").FunContract[]} */
let schema;

describe ("for cli", () => {

	before (() => {
		contents = fs.readFileSync ("./test/fixtures/cli.js");
		schema = parseSource (contents.toString());
	});	

	it ("should parse list function schema", () => {

		// throw new Error (process.cwd());

		const connectSchemes = schema.filter (fn => fn.name === "connect");
		assert.strictEqual (connectSchemes.length, 1);
		const connectSchema = connectSchemes[0];

	});

	it ("should have all parameters fulfilled for long arg names", () => {
		// console.log(schema[1]);
	});

});