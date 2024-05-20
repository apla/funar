# funar

Signature parser for functions

![github action](https://github.com/apla/funar/actions/workflows/node.js.yml/badge.svg)
[![codecov](https://codecov.io/github/apla/funar/graph/badge.svg?token=SB2023EEU8)](https://codecov.io/github/apla/funar)
![npm](https://img.shields.io/npm/v/funar)

### Example

`funar` allows you to convert this function:

```javascript
// example package: `jscertооl`; source path: `src/cli.js`
/**
 * Update certificate on local machine using an existing TLS certificate
 * @param   {Object}  options
 * @param   {string}  options.domainName Domain name to download the certificate for
 * @param   {boolean} [options.verbose]  Be verbose
 * @returns {Promise}
 */
export async function updateCertificate ({domainName, verbose}) {…}
```

To this CLI:

```
$ npx jscertооl updateCertificate --domainName google.example
```

No configuration required!

## Getting started

### Generate CLI from ESM

Run the generator:

```bash
$ npx funar cli -i src/<cli>.js -o bin/<packageName>.js
```

(Optionally) setup `package.json` for `npx`:

```bash
npm pkg set bin.$(npm pkg get name | xargs echo)=./bin/<packageName>.js
```

## Compatibility

### Running

Only ESM modules are supported right now

### Testing

Node.js v22 is required because of native V8 coverage

## How it works

How is this possible? The function metadata already includes:

 * The function's input contract, specifying the input data structure,
 parameter types, and associated destructured variable names
 * Function output contract
 * Synchronized parameter descriptions (you can use tsc to ensure
 the documentation is in sync with the function declaration)
 * The exported name to allow running different functions in one executable

Running a function as a CLI is straightforward if you have a function contract.
Here's the process:

 1. Parse input parameter values from command line arguments
 2. Validate input parameter values
 3. Pass values to the function

Additional features:

 * [ ] Function name and parameter autocompletion;
 * [*] Generate usage for a function
 * [*] Generate usage for an executable to list all the functions
 * [ ] Support …rest to read extra arguments


