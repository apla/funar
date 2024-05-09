import fs from "fs";

import assert from "node:assert";

import { it, describe, before } from "node:test";

import { parseSource } from "../funar.js";

let contents;
/** @type {import("../funar.js").FunContract[]} */
let meta;

// @ts-ignore
describe ("for webapp", () => {

	// @ts-ignore
	before (() => {
		contents = fs.readFileSync ("./test/fixtures/webapp.js");
		meta = parseSource (contents.toString());
	});
	
	// @ts-ignore
	it ("should parse list function metainformation", () => {
		const searchFnMetaAll = meta.filter (fn => fn.name === "search");
		assert.strictEqual(searchFnMetaAll.length, 1);
		const searchFnMeta = searchFnMetaAll[0];

		const expressHandlerMetaAll = meta.filter (fn => !fn.name);
		assert.strictEqual(expressHandlerMetaAll.length, 1);
		const expressHandlerMeta = expressHandlerMetaAll[0];
	});

});