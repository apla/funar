// import commentParser from 'comment-parser';
/** @typedef {import('comment-parser').Spec} Spec */
import {parse as commentParser } from 'comment-parser';

import * as acorn from 'acorn';
const parse = acorn.parse;

import {getVarsFromDeclaration} from './ast.js';

import {TypeDef} from './typedef.js';

// https://www.npmjs.com/package/jsdoctypeparser
// https://github.com/dsheiko/bycontract
// https://github.com/joelday/vscode-docthis/blob/master/src/documenter.ts
// https://alligator.io/js/traversing-ast/

// https://www.npmjs.com/package/inline-comment-parser

// typescript validation
// https://github.com/pelotom/runtypes
// 

// parsing functions
// https://github.com/tunnckoCore/opensource/blob/master/packages/parse-function/test/index.js
// https://www.npmjs.com/package/cpp-function-header

// ditching typescript
// https://medium.com/@art_deco/how-to-ditch-typescript-for-jsdoc-212ff1978542
// https://github.com/artdecocode/documentary
// https://github.com/artdecocode/typal

/**
 * @typedef FunParameter
 * @property {string}  name internal function variable name
 * @property {string}  [alias] defaults to other literal
 * @property {string}  path parameter position number or destructuring locator
 * @property {any}     [default] default value
 * @property {string}  [description] parameter description
 * @property {string}  [type = undefined] parameter type
 * @property {boolean} [isOptional] false
 */


/**
 * @typedef FunContract
 * @property {string} name function name
 * @property {string} [description] function description from JSDoc
 * @property {Object<string,FunParameter>} vars function variables from arguments
 */


function findNodeIndexForComment (ast, nodeIndex, commentNode) {
	while (
		ast.body[nodeIndex].start < commentNode.end
		&& nodeIndex < ast.body.length
	) {
		nodeIndex ++;
	}

	return nodeIndex;
}

function findPrecedingCommentNode (currNode, jsDocNodes, prevDocNodeIdx) {
	if (!jsDocNodes || jsDocNodes.length === 0) {
		return;
	}

	let docNodeIdx = prevDocNodeIdx === undefined ? -1 : prevDocNodeIdx;

	while (
		(jsDocNodes.length > docNodeIdx + 1)
		&& (jsDocNodes[docNodeIdx + 1].end < currNode.end)
	) {
		docNodeIdx ++;
	}

	return docNodeIdx > -1 ? docNodeIdx : undefined;

}

const tagRename  = {optional: 'isOptional'};
const usefulTags = 'description type optional isOptional default'.split (' ');

function augmentParamDescription (paramDesc, jsdocParamDesc) {
	
	usefulTags.forEach (
		k => jsdocParamDesc[k] !== undefined && (paramDesc[tagRename[k] || k] = paramDesc[k] || jsdocParamDesc[k])
	);
}

function combineArgMeta (argMeta, jsDocParam) {
	return usefulTags.reduce((combinedArgMeta, tag) => {
		if (jsDocParam[tag] !== undefined) {
			combinedArgMeta[tagRename[tag] || tag] = combinedArgMeta[tag] || jsDocParam[tag];
		}
		return combinedArgMeta;
	}, {...argMeta});
}

/**
 * Function declaration can contain list of param names or structure with
 * param names. Each of those params will be turn into variable on function call.
 * This function returns flat list of named parameters.
 * @param {Object<string,FunParameter>} vars 
 * @param {*} jsdoc 
 */
function documentVariables (vars, jsdoc) {
	/** @type {Object<string,FunParameter>} */
	const namedParams = {};

	// TODO: add guard for parameter count and top jsdoc @param tag count match

	const jsdocParamsByPath = {...jsdoc.paramsByPath};
	
	Object.keys(jsdoc.paramsByPath).forEach(path => {
		const param = jsdoc.paramsByPath[path];
		const customType = TypeDef.lookup({name: param.type});
		if (customType && customType.type === 'Object') {
			Object.keys (customType.props).forEach ((propName) => {
				const destructuredPath = `${path}.${propName}`;
				const paramFromProps = {name: propName, path: destructuredPath};
				namedParams[propName] = combineArgMeta(paramFromProps, customType.props[propName]);
				jsdocParamsByPath[destructuredPath] = paramFromProps;
			});
		}
	});

	Object.keys(vars).forEach((varName, idx) => {
		/** @type {FunParameter} */
		const varMeta = vars[varName];

		// if we already have processed param, we don't need to do it again
		if (namedParams[varMeta.name]) return;
		
		let paramJsdoc = {};
		
		// no destructuring, regular variable, param.variable means param.name
		if (varMeta.name && jsdocParamsByPath[varMeta.path]) {
			paramJsdoc = jsdocParamsByPath[varMeta.path];
			namedParams[varMeta.name] = combineArgMeta(varMeta, paramJsdoc);
			return;
		}

		// param is not documented
		namedParams[varMeta.name] = varMeta;
	});

	return namedParams;
}

/**
 * @typedef FunJSDoc
 * @type {Object}
 * @prop {string} [kind]
 * @prop {string} [description]
 * @prop {Object} paramsByPath
 * @prop {TypeDef} [typedef]
 * @prop {Spec[]} tags
 * @prop {number} start
 * @prop {number} end
 */

/**
 * Parse JSDoc structure from JSDoc text, compatible with acorn onComment event
 * 
 * @param {boolean} isBlock specifies that comment is a block one with asterisks
 * @param {string} commentText comment text without comment start and end tokens
 * @param {number} start starting position in the source
 * @param {number} end ending position in the source
 * @returns {FunJSDoc|undefined}
 */
function parseJsdocFromComment (isBlock, commentText, start, end) {

	// jsdoc comments only appears within comment blocks
	if (!isBlock)
		return;
	// just a regular block comment
	if (commentText[0] !== '*')
		return;

	const jsdoc = (commentParser('/*' + commentText + '*/') || [])[0];

	// const paramByName = {};
	// const paramByNameTop = {};
	const paramsByPath = {};
	// const paramTagTree = [];

	const paramTags = [];
	/** @type {string | undefined} */
	let descriptionFromTag;
	/** @type {Spec | undefined} */
	let typedefTag;
	/** @type {Spec | undefined} */
	let typeTag;
	/** @type {Spec | undefined} */
	let rangeTag;
	const propTags  = [];

	let kind;
	let typedef;
	// let baseType;
	const props = {};

	jsdoc.tags.forEach ((tag) => {
		const tagName = tag.tag;
		if (tagName === 'param') {
			paramTags.push (tag);
		} else if (tagName === 'description') {
			descriptionFromTag = tag.source.join(' ').slice (tagName.length + 1).trim();
		} else if (tagName === 'typedef') {
			typedefTag = tag;
		} else if (tagName === 'type') {
			typeTag = tag;
		} else if (tagName === 'range') {
			rangeTag = tag;
		} else if (tagName === 'prop' || tagName === 'property') {
			propTags.push (tag);
		}
	});

	let topParamIndex = -1;

	const description = jsdoc.description || descriptionFromTag;

	if (paramTags.length) {
		kind = "params";
		paramTags.forEach ((tag, idx) => {
			// paramByName[tag.name.replace (/.*\./, '')] = tag;
			// paramByName[tag.name] = tag;
			const [, prefix, name] = tag.name.match (/(?:(.*)\.)?(.*)/);
			if (prefix) {
				// paramByName[prefix].subTags = (paramByName[prefix].subTags || {});
				// paramByName[prefix].subTags[name] = tag;

				// for destructured object JSDoc have named positional parameter,
				// but function declaration have no name, only position.
				// we need to replace first path chunk before dot to parameter index
				paramsByPath[`${topParamIndex}.${tag.name.replace(/^[^\.]+\./, '')}`] = tag;
			} else {
				topParamIndex ++;
				tag.argIndex = topParamIndex;
				paramsByPath['' + topParamIndex] = tag;
				// paramByNameTop[tag.name] = tag;
				// paramTagTree.push (tag);
			}
		}
		//).filter (
			// remove object params internal fields
		//	tag => !tag.name.match (/\./)
		);
	} else if (typedefTag) {
		kind = "typedef";

		// TODO: /** @typedef {import('acorn')} acorn */
		// TODO: /** @typedef {import('./funar.js').FunParameter} FunParameter */
		// TODO: /** @typedef {'after'|'before'|'between'|'day'} PointInTime */

		propTags.forEach ((tag, idx) => {
			props[tag.name] = tag;
		});

		typedef = new TypeDef ({
			name: typedefTag.name,
			baseType: typeTag ? typeTag.type : undefined,
			props,
			range: rangeTag ? rangeTag.name : undefined,
			// pattern: 
			description,
		});
	}

	return {
		kind,
		// baseType,
		description,

		// paramTags,
		// paramByName,
		// paramByNameTop,
		// paramTagTree,
		paramsByPath,
		
		typedef,

		tags: jsdoc.tags,

		start,
		end
	};

}

/**
 * 
 * @param {FunJSDoc[]} docNodes 
 * @returns {Object<string, TypeDef>|undefined}
 */
function findTypedefs (docNodes) {
	if (!docNodes || docNodes.length === 0) {
		return;
	}

	return docNodes.filter (
		docNode => docNode.kind === 'typedef'
	).filter(
		docNode => docNode.typedef
	).map(
		docNode => docNode.typedef
	).reduce((typedefs, typedef) => {
		// @ts-ignore undefined .typedef is filtered out
		typedefs[typedef.name] = typedef;
		return typedefs;
	}, {});

}

/**
 * 
 * @param {acorn.VariableDeclaration} entity 
 */
function processNamedVarDeclaration (entity) {
	let name, declaration;
	// ignoring additional declarations
	const firstDeclaration = entity.declarations[0];
	if (
		firstDeclaration.type === "VariableDeclarator"
		&& firstDeclaration.id.type === "Identifier"
		&& firstDeclaration.init
		&& firstDeclaration.init.type === "ArrowFunctionExpression"
	) {
		name = firstDeclaration.id.name;
		declaration = firstDeclaration.init;
	}
	return {name, declaration};
}

/**
 * Parse source and return all found function contracts
 * @param {string} source source code
 * @param {Object} [options] parsing options
 * @returns {Array<FunContract>}
 */
export function parseSource (source, options) {
	/** @type {FunJSDoc[]} */
	const fnDocs = [];

	const ast = parse (source, {
		onComment (isBlock, text, start, end) {
			const jsdoc = parseJsdocFromComment (isBlock, text, start, end);
			if (jsdoc) fnDocs.push(jsdoc);
		},
		ecmaVersion: 'latest',
		locations: true,
		allowImportExportEverywhere: true,
	});

	const typedefs = findTypedefs(fnDocs);

	let nodeIndex = 0;
	let docNodeIdx;

	// limit by top level functions only
	// TODO: move to ast
	const fns = ast.body.map ((entity, entityIdx) => {

		/** @satisfies {'function'|'express-handler'|'cli-handler'} */
		let kind = "function";
		let method;
		let path;

		let declaration, unwrapped = entity;
		let name;

		if (unwrapped.type ===  'ExportNamedDeclaration' && unwrapped.declaration) {
			unwrapped = unwrapped.declaration;
		}
		
		if (unwrapped.type === 'FunctionDeclaration') {
			declaration = unwrapped;
			name = declaration.id.name;
		} else if (unwrapped.type === 'VariableDeclaration') {
			// ignoring additional declarations
			({name, declaration} = processNamedVarDeclaration(unwrapped));			
		}

		if (!declaration || !name) return;

		const vars = getVarsFromDeclaration(declaration.params);

		/** @type {FunContract} */
		const funContract = {
			name,
			// type: entity.type,
			description: undefined,
			vars,
		};

		docNodeIdx = findPrecedingCommentNode (
			ast.body[entityIdx],
			fnDocs,
			docNodeIdx
		);

		if (docNodeIdx === undefined) {
			return funContract;
		}
		
		// found commend which starts earlier than preceding entity end
		if (entityIdx > 0 && ast.body[entityIdx - 1].end > fnDocs[docNodeIdx].start) {
			return funContract;
		}
		
		const fnDoc = fnDocs[docNodeIdx];

		funContract.description = fnDoc.description;

		const documentedVars = documentVariables(vars, fnDoc);

		funContract.vars = documentedVars;

		return funContract;

	}).filter (fn => fn !== undefined);


	return fns;
}

