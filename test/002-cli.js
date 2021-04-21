import fs from 'fs';

import assert from 'assert';

import {parseSource} from '../funar.js';

let contents;
let schema;

describe ("for cli", () => {

	beforeAll (() => {
		contents = fs.readFileSync ('./test/fixtures/cli.js');
		schema = parseSource (contents.toString());
	});	

	it ("should parse list function schema", () => {
		const connectSchemes = schema.filter (fn => fn.name === 'connect');
		assert.strictEqual (connectSchemes.length, 1);
		const connectSchema = connectSchemes[0];

	});

});