import { exec as execWithCb } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert";
import { describe, it, before } from "node:test";
import { writeFile } from "node:fs/promises";

const exec = promisify(execWithCb);

/**
 * Async exec wrapper to provide stdout or throw an exception
 * @param {string} command command to execute
 * @returns {Promise<string>}
 */
async function execCmd(command, {cwd = process.cwd()} = {}) {
	try {
		const { stdout, stderr } = await exec(command, {cwd});
		return stdout;
	} catch (error) {
		throw new Error(`Command failed with error code: ${error.code}\n${error}\nOutput: ${error.stdout} ${error.stderr}`);
	}
}

describe("cli generator", function() {

	before(async () => {
		await writeFile("./test/fixtures/cli-input.js", `
/**
 * Echo a and b
 * @param {string} a a
 * @param {string} b b
 * */
export function testAB (a, b) {
	console.log(a);
	console.log(b);
}

/**
 * Sum 3 numbers
 * @param {Object} options
 * @param {number} options.x x
 * @param {number} options.y y
 * @param {number} options.z z
 * */
export function testXYZ ({x, y, z}) {
	// x, y, and z are actually numbers
	const result = x + y + z;
	// avoid nodejs util.inspect number ascii color wrapping
	console.log(result.toString());
}

		`);

		await writeFile("./test/fixtures/package.json", `
		{
			"name": "fixtures",
			"version": "1.0.0",
			"type": "module",
			"author": "",
			"license": "ISC",
			"description": ""
		  }

		`);
	});

	it("should return stdout for a successful command", async () => {
		const result = await execCmd("echo Hello World");
		assert.strictEqual(result.trim(), "Hello World");
	});

	it("should throw an error for a failing command", async function() {
		try {
			await execCmd("nonexistent-command");
			// If the above line does not throw, the test should fail
			assert.fail("Expected error was not thrown");
		} catch (error) {
			assert.strictEqual(error.message.includes("Command failed with error code"), true);
		}
	});

	it("should generate a file from example", async () => {

		await execCmd("node ./bin/funar.js cli -i ./test/fixtures/cli-input.js -o ./test/fixtures/cli-output.js");

	});

	it("should generate a file from example cwd fixtures", async () => {

		await execCmd(
			"node ../../bin/funar.js cli -i ./cli-input.js -o ./cli-output.js",
			{cwd: "./test/fixtures"}
		);

		await execCmd(
			"npm pkg set bin.$(npm pkg get name | xargs echo)=./cli-output.js",
			{cwd: "./test/fixtures"}
		);

	});

	it("should display a list of commands", async () => {

		try {
			await execCmd("node ./test/fixtures/cli-output.js");
		} catch (error) {
			assert(error.message.includes("Echo a and b"));
			assert(error.message.includes("Sum 3 numbers"));
		}

	});

	it("should echo a and b", async () => {

		const testABOut = await execCmd("node ./test/fixtures/cli-output.js testAB --a hello --b world");

		assert.strictEqual(testABOut.trim(), "hello\nworld");

	});

	it("should echo a and b, short options", async () => {

		const testABOut = await execCmd("node ./test/fixtures/cli-output.js testAB -a hello -b world");

		assert.strictEqual(testABOut.trim(), "hello\nworld");

	});

	it("should sum 3 numbers", async () => {

		const testXYZOut = await execCmd("node ./test/fixtures/cli-output.js testXYZ --x 25 --y 50 --z 75");

		assert.strictEqual(testXYZOut.trim(), "150");

	});

	it("should sum 3 numbers, short options", async () => {

		const testXYZOut = await execCmd("node ./test/fixtures/cli-output.js testXYZ -x 25 -y 50 -z 75");

		assert.strictEqual(testXYZOut.trim(), "150");

	});


});
