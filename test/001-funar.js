import fs from 'fs';

import assert from 'assert';

import {parseSource} from '../funar.js';

describe ("function contract params", () => {

	describe ("basics:", () => {

		it ("should find the function without description", () => {
			const fn = `function a1 (a, b) {}`;
			const contracts = parseSource (fn);
			assert.equal (contracts.length, 1);

			const contract = contracts[0];

			assert.equal (contract.name, 'a1');

			assert (!('description' in contract));
		});

		it ("should find the function with description", () => {
			const fn = `/**\n * A2 function\n */\nfunction a2 (a, b) {}`;
			const contracts = parseSource (fn);
			assert.equal (contracts.length, 1);

			const contract = contracts[0];

			assert.equal (contract.name, 'a2');

			assert ('description' in contract);

			assert (contract.description);
		});

		it ("should find the function with description and param descriptions", () => {
			const fn = `
/**
 * A2 function
 * @param {string} a the a string
 * @param {number} b the b number
 * @param {number} rest rest of arguments
*/
function a2 (a, b, ...rest) {}`;
			const contracts = parseSource (fn);
			assert.equal (contracts.length, 1);

			const contract = contracts[0];

			assert.equal (contract.name, 'a2');

			assert ('description' in contract);

			assert (contract.description);

			assert.strictEqual (contract.params.length, 3);

			const aParam = contract.params.filter (p => p.variable === 'a')[0];
			
			assert.strictEqual (aParam.type, 'string');
			assert.strictEqual (aParam.description, 'the a string');

			const bParam = contract.params.filter (p => p.variable === 'b')[0];

			assert.strictEqual (bParam.type, 'number');
			assert.strictEqual (bParam.description, 'the b number');

			console.log (contract);
		});


		it ("should find the function with description and params object", () => {
			const fn = `/**\n * A3 function\n */\nfunction a3 ({a, b}) {}`;
			const contracts = parseSource (fn);
			assert.equal (contracts.length, 1);

			const contract = contracts[0];

			assert.equal (contract.name, 'a3');

			assert ('description' in contract);

			assert (contract.description);

			console.log (contract);
		});

		it ("should find the function with description and params object w/default", () => {
			const fn = `/**\n * A4 function\n */\nfunction a4 ({a, b} = {}) {}`;
			const contracts = parseSource (fn);
			assert.equal (contracts.length, 1);

			const contract = contracts[0];

			assert.equal (contract.name, 'a4');

			assert ('description' in contract);

			assert (contract.description);

			assert.equal (contract.params.length, 1);

			const param = contract.params[0];

			assert.deepStrictEqual (param.object, {
				a: {variable: 'a'}, b: {variable: 'b'}
			});

			console.log (contract, contract.params[0]);
		});

		it ("should find the function with description and params object 2", () => {
			const fn = `/**\n * A5 function\n */\nfunction a5 ({aKey: aVar, bKey: bVar}) {}`;
			const contracts = parseSource (fn);
			assert.equal (contracts.length, 1);

			const contract = contracts[0];

			assert.equal (contract.name, 'a5');

			assert ('description' in contract);

			assert (contract.description);

			assert.equal (contract.params.length, 1);

			const param = contract.params[0];

			assert.deepStrictEqual (param.object, {
				aKey: {variable: 'aVar'}, bKey: {variable: 'bVar'}
			});
		});


		it ("should find the function with description and deep params object", () => {
			const fn = `/**
 * A6 function
 * @param {Object} req request
 * @param {Object} req.params uri path chunks
 * @param {Object} req.query parsed query string
 * @param {Object} req.query.color color from query string
 */
function a6 ({path, params: {scope: apiScope, method: apiMethod}, query: {color: queryColor}}) {
	return displayName + ' is ' + name;
}`;
			const contracts = parseSource (fn);
			assert.equal (contracts.length, 1);

			const contract = contracts[0];

			assert.equal (contract.name, 'a6');

			assert ('description' in contract);

			assert (contract.description);

			assert.equal (contract.params.length, 1);

			const param = contract.params[0];

			assert.deepStrictEqual (param.object, {
				aVar: 'aKey', bVar: 'bKey'
			});
		});

		it ("should find the function with description and param object descriptions", () => {
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

			console.log (contracts[0].named);

			assert.equal (contracts.length, 1);

			const contract = contracts[0];

			assert.equal (contract.name, 'a8');

			assert ('description' in contract);

			assert (contract.description);

			assert.strictEqual (contract.params.length, 1);

			console.log (contract);

			assert (contract.named); // gives

			const aParam = contract.params.filter (p => p.name === 'a')[0];
			
			assert.strictEqual (aParam.type, 'string');
			assert.strictEqual (aParam.description, 'the a string');

			const bParam = contract.params.filter (p => p.name === 'b')[0];

			assert.strictEqual (bParam.type, 'number');
			assert.strictEqual (bParam.description, 'the b number');

			console.log (contract);
		});

	});

	describe ("regular params", () => {
		const fnBody = `function a (a, b) {}`
		const schema = parseSource ();
		console.log ('schema', schema);
	});

	describe ("for cli", () => {

		const contents = fs.readFileSync ('./test/fixtures/cli.js');
		const schema = parseSource (contents.toString());
		console.log ('schema', schema);

		it ("should parse list function schema", () => {
			const listSchemas = schema.filter (fn => fn.context.name === 'list');
			assert.equal (listSchemas.length, 1);
			const listSchema = listSchemas[0];
			assert (listSchema.jsdoc.description);
			assert (listSchema.jsdoc.description);

		});

	});

	describe ("for webapp", () => {

		const contents = fs.readFileSync ('./test/fixtures/webapp.js');
		const schema = parseSource (contents.toString());
		console.log ('schema', schema);

		it ("should parse list function schema", () => {
			const listSchemas = schema.filter (fn => fn.context.name === 'list');
			assert.equal (listSchemas.length, 1);
			const listSchema = listSchemas[0];
			assert (listSchema.jsdoc.description);
			assert (listSchema.jsdoc.description);

		});

	});

});