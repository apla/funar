// import commentParser from 'comment-parser';
/** @typedef {import('comment-parser').Spec} JSDocTag */
import {parse as commentParser } from 'comment-parser';

import { getVarsFromSource } from './ast.js';

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
 * @description Structure describes function parameter. If parameter type is an array, enum, or object,
 * then `special` field is set and `primitiveType` set to the type of the array items,
 * enum items, or object values.
 * @typedef FunParameter
 * @property {string}  name internal function variable name
 * @property {string}  [alias] defaults to other literal
 * @property {string}  path parameter position number or destructuring locator
 * @property {any}     [default] default value
 * @property {string}  [description] parameter description
 * @property {string}  [type] parameter type
 * @property {boolean} [isOptional] is parameter optional
 * @property {"array"|"enum"|"object"} [structure] parameter structure: array, enum, or object
 * @property {string}  [contains] element type for structured parameter
 */


/**
 * @typedef FunContract
 * @property {string} name function name
 * @property {string} [description] function description from JSDoc
 * @property {Object<string,FunParameter>} vars function variables from arguments
 */


/**
 *
 * @param {number} currNodeEnd end position of the current node
 * @param {FunJSDoc[]} jsDocNodes array of JSDoc comment nodes
 * @param {number | undefined} prevDocNodeIdx previous JSDoc comment node index
 * @returns {number | undefined}
 */
function findPrecedingCommentNode (currNodeEnd, jsDocNodes, prevDocNodeIdx) {
	if (!jsDocNodes || jsDocNodes.length === 0) {
		return;
	}

	let docNodeIdx = prevDocNodeIdx === undefined ? -1 : prevDocNodeIdx;

	while (
		(jsDocNodes.length > docNodeIdx + 1)
		&& (jsDocNodes[docNodeIdx + 1].end < currNodeEnd)
	) {
		docNodeIdx ++;
	}

	return docNodeIdx > -1 ? docNodeIdx : undefined;

}

const tagRename  = {optional: 'isOptional'};
const usefulTags = 'description type optional isOptional default structure contains'.split (' ');

function augmentParamDescription (paramDesc, jsdocParamDesc) {

	usefulTags.forEach (
		k => jsdocParamDesc[k] !== undefined && (paramDesc[tagRename[k] || k] = paramDesc[k] || jsdocParamDesc[k])
	);
}

function combineArgMeta (argMeta, jsDocParam) {
	return usefulTags.reduce((combinedArgMeta, tag) => {
		if (jsDocParam[tag] !== undefined) {
			if (tag === "default" && argMeta[tag] !== jsDocParam[tag]) {
				console.error("Default value mismatch between function declaration and jsdoc", argMeta, jsDocParam);
			}
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
 * @prop {JSDocTag[]} tags
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
	/** @type {Object<string,FunParameter>} */
	const paramsByPath = {};
	// const paramTagTree = [];

	/** @type {JSDocTag[]} */
	const paramTags = [];
	/** @type {string | undefined} */
	let descriptionFromTag;
	/** @type {JSDocTag | undefined} */
	let typedefTag;
	/** @type {JSDocTag | undefined} */
	let typeTag;
	/** @type {JSDocTag | undefined} */
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
		let paramPath;

		paramTags.forEach ((tag, idx) => {
			// paramByName[tag.name.replace (/.*\./, '')] = tag;
			// paramByName[tag.name] = tag;
			const matchingDestructured = tag.name.match (/(?:(.*)\.)?(.*)/);
			if (matchingDestructured && matchingDestructured[1]) {
				const [, prefix, name] = matchingDestructured;
				// paramByName[prefix].subTags = (paramByName[prefix].subTags || {});
				// paramByName[prefix].subTags[name] = tag;

				// for destructured object JSDoc have named positional parameter,
				// but function declaration have no name, only position.
				// we need to replace first path chunk before dot to parameter index
				paramPath = `${topParamIndex}.${tag.name.replace(/^[^\.]+\./, '')}`;
			} else {
				topParamIndex ++;
				// param.argIndex = topParamIndex;
				paramPath = '' + topParamIndex;
			}

			/** @type {FunParameter} */
			let param = {
				name: tag.name,
				type: tag.type,
				description: tag.description,
				default: tag.default,
				isOptional: tag.optional,
				path: paramPath
			};

			const specialityMatch = tag.type.match(/(.*)\[\]$|^Array<(.*)>$|^Object<(.*)>$|^Record<(.*)>$/);
			if (specialityMatch) {
				const [, arr1, arr2, obj1, obj2] = specialityMatch;
				param.structure = arr1 || arr2 ? "array" : obj1 || obj2 ? "object" : undefined;
				param.contains  = arr1 ?? arr2 ?? obj1 ?? obj2;

			}

			if (param.default) {
				// bit hacky, but works for most cases
				param.default = JSON.parse(param.default);
			}

			paramsByPath[paramPath] = param;
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
 * Parse source and return all found function contracts
 * @param {string} source source code
 * @param {Object} [options] parsing options
 * @returns {Array<FunContract>}
 */
export function parseSource (source, options) {
	/** @type {FunJSDoc[]} */
	const fnDocs = [];

	function onComment (isBlock, text, start, end) {
		const jsdoc = parseJsdocFromComment (isBlock, text, start, end);
		if (jsdoc) fnDocs.push(jsdoc);
	}

	const typedefs = findTypedefs(fnDocs);

	let nodeIndex = 0;
	/** @type {number | undefined} */
	let docNodeIdx;

	const astMeta = getVarsFromSource(source, onComment);

	// limit by top level functions only
	// TODO: move to ast
	const fns = astMeta.map (({name, vars, pos}) => {

		/** @satisfies {'function'|'express-handler'|'cli-handler'} */
		let kind = "function";
		let method;
		let path;

		/** @type {FunContract} */
		const funContract = {
			name,
			// type: entity.type,
			description: undefined,
			vars,
		};

		docNodeIdx = findPrecedingCommentNode (
			pos.end,
			fnDocs,
			docNodeIdx
		);

		if (docNodeIdx === undefined) {
			return funContract;
		}

		// found commend which starts earlier than preceding entity end
		if (pos.prev && pos.prev > fnDocs[docNodeIdx].start) {
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

