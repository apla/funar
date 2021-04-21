import fs from 'fs';

import assert from 'assert';

import {parseSource} from '../funar.js';

describe ("contracts from function", () => {

	it ("without description", () => {
		const fn = `function a1 (a, b) {}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, 'a1');
	});

	it ("with description", () => {
		const fn = `/**\n * A2 function\n */\nfunction a2 (a, b) {}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, 'a2');

		assert ('description' in contract);

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

		assert.strictEqual (contract.name, 'a2');

		assert ('description' in contract);

		assert (contract.description);

		assert.strictEqual (contract.vars.length, 3);

		const aParam = contract.vars.filter (p => p.name === 'a')[0];
		
		assert.strictEqual (aParam.type, 'string');
		assert.strictEqual (aParam.description, 'the a string');

		const bParam = contract.vars.filter (p => p.name === 'b')[0];

		assert.strictEqual (bParam.type, 'number');
		assert.strictEqual (bParam.description, 'the b number');

		// console.log (contract);
	});


	it ("with description and params object", () => {
		const fn = `/**\n * A3 function\n */\nfunction a3 ({a, b}) {}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, 'a3');

		assert ('description' in contract);

		assert (contract.description);

		console.log (contract);
	});

	it ("with params object w/default", () => {
		const fn = `/**\n * A4 function\n */\nfunction a4 ({a, b} = {}) {}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, 'a4');

		assert ('description' in contract);

		assert (contract.description);

		assert.strictEqual (contract.vars.length, 2);

		assert.deepStrictEqual (contract.vars, [
			{name: 'a', path: '0.a'},
			{name: 'b', path: '0.b'}
		]);
	});

	it ("with params object and rename", () => {
		const fn = `/**\n * A5 function\n */\nfunction a5 ({aKey: aVar, bKey: bVar}) {}`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, 'a5');

		assert ('description' in contract);

		assert (contract.description);

		assert.strictEqual (contract.vars.length, 2);

		assert.deepStrictEqual (contract.vars, [
			{name: 'aVar', path: '0.aKey'},
			{name: 'bVar', path: '0.bKey'},
		]);
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

		assert.strictEqual (contract.name, 'a6');

		assert ('description' in contract);

		assert (contract.description);

		assert.strictEqual (contract.vars.length, 5);

		assert.deepStrictEqual (contract.vars, [
			{ name: 'path',      path: '0.path' },
			{ name: 'apiScope',  path: '0.app.scope', default: 'global' },
			{ name: 'apiMethod', path: '0.app.method' },
			{ name: 'rgb',       path: '0.query.color.rgb', description: 'color rgb part', type: 'Object', isOptional: false },
			{ name: 'alpha',     path: '0.query.color.alpha', description: 'color alpha part', type: 'Object', isOptional: true }
		]);
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
app.get('/', ({query: {color}}, res, next) => {
return displayName + ' is ' + name;
});`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		// each contract means one function
		const contract = contracts[0];

		assert ('description' in contract);

		assert (contract.description);

		assert.strictEqual (contract.vars.length, 3);

		assert.deepStrictEqual (contract.vars, [
			{ name: 'color', path: '0.query.color', description: 'color from query string', type: 'string', isOptional: false },
			{ name: 'res',   path: '1', description: 'response object', type: 'Object', isOptional: false },
			{ name: 'next',  path: '2', description: 'call next middleware', type: 'Function', isOptional: false}
		]);
	});

	it ("in http handler, jsdoc between params", () => {
		const fn = `app.get('/',
/**
* A7A function
* @param {Object} req request object
* @param {Object} req.query 
* @param {Object} req.query parsed query string
* @param {string} req.query.color color from query string
* @param {Object} res response object
* @param {Function} next call next middleware
*/
({query: {color}}, res, next) => {
return displayName + ' is ' + name;
});`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		// each contract means one function
		const contract = contracts[0];

		assert ('description' in contract);

		assert (contract.description);

		assert.strictEqual (contract.vars.length, 3);

		assert.deepStrictEqual (contract.vars, [
			{ name: 'color', path: '0.query.color', description: 'color from query string', type: 'string', isOptional: false },
			{ name: 'res',   path: '1', description: 'response object', type: 'Object', isOptional: false },
			{ name: 'next',  path: '2', description: 'call next middleware', type: 'Function', isOptional: false}
		]);
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

app.get('/',
/**
 * A7B function
 * @param {Object} req request object
 * @param {QueryWithColor} req.query parsed query string
 * @param {Object} res response object
 * @param {Function} next call next middleware
 */
({query: {color}}, res, next) => {
return displayName + ' is ' + name;
});`;
		const contracts = parseSource (fn);
		assert.strictEqual (contracts.length, 1);

		// each contract means one function
		const contract = contracts[0];

		assert ('description' in contract);

		assert (contract.description);

		assert.strictEqual (contract.vars.length, 3);

		assert.deepStrictEqual (contract.vars, [
			{ name: 'color', path: '0.query.color', description: 'color from query string', type: 'string', isOptional: false },
			{ name: 'res',   path: '1', description: 'response object', type: 'Object', isOptional: false },
			{ name: 'next',  path: '2', description: 'call next middleware', type: 'Function', isOptional: false}
		]);
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

		console.log (contracts[0].named);

		assert.strictEqual (contracts.length, 1);

		const contract = contracts[0];

		assert.strictEqual (contract.name, 'a8');

		assert ('description' in contract);

		assert (contract.description);

		assert.strictEqual (contract.vars.length, 5);

		assert (contract.named); // gives

		const aParam = contract.vars.filter (p => p.name === 'varA')[0];
		
		assert.strictEqual (aParam.type, 'string');
		assert.strictEqual (aParam.description, 'the a string');

		const bParam = contract.vars.filter (p => p.name === 'b')[0];

		assert.strictEqual (bParam.type, 'number');
		assert.strictEqual (bParam.description, 'the b number');

	});

});