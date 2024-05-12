import fs from "node:fs";

import { parseArgs } from "node:util";

import assert from "node:assert";

import { it, describe, before } from "node:test";

/** @typedef {import("../src/funar.js").FunContract} FunContract */

import { parseSource } from "../src/funar.js";
import { convertContractToOptions, createObjectMapper } from "../src/cli.js";

/** @type {Buffer} */
let contentsMulti;
/** @type {Buffer} */
let contentsDefault;

/** @type {FunContract[]} */
let schemaMulti;
/** @type {FunContract[]} */
let schemaDefault

describe("for cli", () => {

	before(() => {
		contentsMulti = fs.readFileSync ("./test/fixtures/cli.js");
		schemaMulti = parseSource (contentsMulti.toString());
		contentsDefault = fs.readFileSync ("./test/fixtures/cli-default.js");
		schemaDefault = parseSource (contentsDefault.toString());
	});

	describe("with multiple exports", () => {
		it("should parse list function schema", () => {

			const connectSchemes = schemaMulti.filter(fn => fn.name === "list");
			assert.strictEqual(connectSchemes.length, 1);
			const connectSchema = connectSchemes[0];

		});

		it("should convert contract `connect` to argParser's options", () => {

			const connectSchemes = schemaMulti.filter(fn => fn.name === "connect");
			assert.strictEqual(connectSchemes.length, 1);
			const connectSchema = connectSchemes[0];

			const connectOptions = convertContractToOptions(connectSchema);

			assert.deepStrictEqual(connectOptions.argParserOpts.options, {
				path:     { type: "string", short: "p",},
				baudrate: { type: "string", short: "b",},
				databits: { type: "string",},
				parity:   { type: "string",},
				logFile:  { type: "string",},
				logDiff:  { type: "boolean",}
			});

			assert.deepStrictEqual(connectOptions.argPlacement, {
				path:     "0.path",
    			baudrate: "0.baudrate",
    			databits: "0.databits",
    			parity:   "0.parity",
    			logFile:  "0.logFile",
    			logDiff:  "0.logDiff"
			});

		});

		it("should gather `connect` variable values from argv", () => {

			const connectSchemes = schemaMulti.filter(fn => fn.name === "connect");
			assert.strictEqual(connectSchemes.length, 1);
			const connectSchema = connectSchemes[0];

			const connectOptions = convertContractToOptions(connectSchema);

			const { values: parsedVariables, positionals } = parseArgs({
				options: connectOptions.argParserOpts.options,
				strict: true,
				allowPositionals: true,
				args: ["connect", "--path", "/dev/ttyUSB0", "--baudrate", "115200", "--databits", "8", "--parity", "none", "--logFile", "test.log", "--logDiff"]
			});

			const expectedVariables = {
				path:     "/dev/ttyUSB0",
				baudrate: "115200",
				databits: "8",
				parity:   "none",
				logFile:  "test.log",
				logDiff:  true
			};

			// nodejs return a [Object: null prototype] which prevents object from deep comparison
			assert.deepStrictEqual({...parsedVariables}, expectedVariables);

			assert.deepStrictEqual(positionals, ["connect"]);

		});

		it("should map `connect` variables to the array of function options", () => {

			const connectSchemes = schemaMulti.filter(fn => fn.name === "connect");
			assert.strictEqual(connectSchemes.length, 1);
			const connectSchema = connectSchemes[0];

			const connectOptions = convertContractToOptions(connectSchema);

			const mapper = createObjectMapper(connectOptions.argPlacement);

			const parsedVariables = {
				path:     "/dev/ttyUSB0",
				baudrate: "115200",
				databits: "8",
				parity:   "none",
				logFile:  "test.log",
				logDiff:  true
			};

			const data = mapper(parsedVariables);

			assert.deepStrictEqual(data, [parsedVariables]);

		});

		it("should convert contract `connect2` to argParser's options", () => {

			const connectSchemes = schemaMulti.filter(fn => fn.name === "connect2");
			assert.strictEqual(connectSchemes.length, 1);
			const connectSchema = connectSchemes[0];

			const connectOptions = convertContractToOptions(connectSchema);

			assert.deepStrictEqual(connectOptions.argParserOpts.options, {
				path:      { type: "string",},
				baudrate:  { type: "string",},
				databits:  { type: "string",},
				parity:    { type: "string",},
				stopbits:  { type: "string",},
				reconnect: { type: "boolean",},
				noEcho:    { type: "boolean",},
				newline:   { type: "string",},
				logFile:   { type: "string",},
				logDiff:   { type: "boolean",}
			});

			assert.deepStrictEqual(connectOptions.argPlacement, {
				path:      "0",
				baudrate:  "1",
				databits:  "2",
				parity:    "3",
				stopbits:  "4",
				reconnect: "5",
				noEcho:    "6",
				newline:   "7",
				logFile:   "8",
				logDiff:   "9"
			});

		});

		it("should map `connect2` variables to the array of function options", () => {

			const connectSchemes = schemaMulti.filter(fn => fn.name === "connect2");
			assert.strictEqual(connectSchemes.length, 1);
			const connectSchema = connectSchemes[0];

			const connectOptions = convertContractToOptions(connectSchema);

			const mapper = createObjectMapper(connectOptions.argPlacement);

			const parsedVariables = {
				path:      "/dev/ttyUSB0",
				baudrate:  "115200",
				databits:  "8",
				parity:    "none",
				stopbits:  1,
				reconnect: true,
				noEcho:    false,
				newline:   "LF",
				logFile:   "test.log",
				logDiff:   true
			};

			const data = mapper(parsedVariables);

			assert.deepStrictEqual(data, [
  				"/dev/ttyUSB0", // path
  				"115200",       // baudrate
  				"8",            // databits
  				"none",         // parity
  				1,              // stopbits
  				true,           // reconnect
  				false,          // noEcho
  				"LF",           // newline
  				"test.log",     // logFile
  				true            // logDiff
			]);

		});


		it("should have all parameters fulfilled for long arg names", () => {
			// console.log(schema[1]);
		});
	});


	describe.skip("with default export", () => {
		it("should parse list function schema", () => {

			// throw new Error (process.cwd());

			const connectSchemes = schemaDefault.filter (fn => fn.name === "connect");
			assert.strictEqual (connectSchemes.length, 1);
			const connectSchema = connectSchemes[0];

		});

		it("should have all parameters fulfilled for long arg names", () => {
			// console.log(schema[1]);
		});
	});

});
