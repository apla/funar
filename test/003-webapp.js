import fs from 'fs';

import assert from 'assert';

import {parseSource} from '../funar.js';

let contents;
let schema;


describe ("for webapp", () => {

	beforeAll (() => {
		contents = fs.readFileSync ('./test/fixtures/webapp.js');
		schema = parseSource (contents.toString());
	});
	

	it ("should parse list function schema", () => {
		const searchSchemes = schema.filter (fn => fn.name === 'search');
		assert.strictEqual (searchSchemes.length, 1);
		const searchScheme = searchSchemes[0];

		assert.strictEqual (searchScheme.kind, 'function');

		const expressSchemes = schema.filter (fn => !fn.name);
		assert.strictEqual (expressSchemes.length, 1);
		const expressScheme = expressSchemes[0];

		console.log (expressScheme);

		assert.strictEqual (expressScheme.kind, 'express-handler');
	});

});