import commentParser from 'comment-parser';

import {parse} from 'acorn';

import {getVarsFromDeclaration} from './ast.js';

import {TypeDef} from './typedef.js';

// https://www.npmjs.com/package/jsdoctypeparser
// https://github.com/dsheiko/bycontract
// https://github.com/joelday/vscode-docthis/blob/master/src/documenter.ts
// https://alligator.io/js/traversing-ast/

// https://www.npmjs.com/package/inline-comment-parser

// typescript validation
// https://github.com/pelotom/runtypes

// parsing functions
// https://github.com/tunnckoCore/opensource/blob/master/packages/parse-function/test/index.js
// https://www.npmjs.com/package/cpp-function-header

// ditching typescript
// https://medium.com/@art_deco/how-to-ditch-typescript-for-jsdoc-212ff1978542
// https://github.com/artdecocode/documentary
// https://github.com/artdecocode/typal

/**
 * @typedef FunParameter
 * @property {string} name internal function variable name
 * @property {string} path parameter position number or destructuring locator
 * @property {string} [description] parameter description
 * @property {string} type parameter type
 * @property {boolean} isOptional: false
 */


/**
 * @typedef FunContract
 * @property {string} name function name
 * @property {string} [description] function description from JSDoc
 * @property {Array<FunParameter>} params positional function parameters
 * @property {Object<string,FunParameter>} named named function parameters
 */


function parseASTObjectPattern (node) {

}



/**
 * 
 */
// app.get ('/', ({path, params: {scope: apiScope = 'global', method: apiMethod}, query: {color: queryColor}}) => {
// 	return displayName + ' is ' + name;
// });


function findNodeIndexForComment (ast, nodeIndex, commentNode) {
	while (
		ast.body[nodeIndex].start < commentNode.end
		&& nodeIndex < ast.body.length
	) {
		// console.log (ast.body[nodeIndex].start, commentNode.end);
		// console.log ('skipped ', ast.body[nodeIndex]);
		nodeIndex ++;
	}

	return nodeIndex;
}

function findPrecedingCommentNode (currNode, docNodes, prevDocNodeIdx) {
	if (!docNodes || docNodes.length === 0) {
		return;
	}

	let docNodeIdx = prevDocNodeIdx === undefined ? -1 : prevDocNodeIdx;

	// console.log (
	// 	prevDocNodeIdx,
	// 	'docNodes.length', docNodes.length,
	// 	'jsdoc end', docNodes[0].end,
	// 	'fn start', currNode.start,
	// 	docNodes.length > docNodeIdx + 1,
	// 	docNodes[docNodeIdx + 1].end < currNode.start
	// );

	while (
		(docNodes.length > docNodeIdx + 1)
		&& (docNodes[docNodeIdx + 1].end < currNode.end)
	) {
		docNodeIdx ++;
	}

	return docNodeIdx > -1 ? docNodeIdx : undefined;

}

const tagRename = {optional: 'isOptional'};
const usefulTags = 'description type optional isOptional default'.split (' ');

function augmentParamDescription (paramDesc, jsdocParamDesc) {
	
	usefulTags.forEach (
		k => jsdocParamDesc[k] !== undefined && (paramDesc[tagRename[k] || k] = paramDesc[k] || jsdocParamDesc[k])
	);
}

/**
 * Function declaration can contain list of param names or structure with
 * param names. Each of those params will be turn into variable on function call.
 * This function returns flat list of named parameters.
 * @param {*} params 
 * @param {*} jsdoc 
 */
function combineNamedParams (params, jsdoc) {
	console.log ('PARAMS', params, jsdoc.paramsByPath);

	const namedParams = {};

	// TODO: add guard for parameter count and top jsdoc @param tag count match

	const jsdocParamsByPath = {...jsdoc.paramsByPath};
	
	Object.keys (jsdoc.paramsByPath).forEach (path => {
		const param = jsdoc.paramsByPath[path];
		const customType = TypeDef.lookup({name: param.type});
		if (customType && customType.type === 'Object') {
			console.log ('CUSTOM TYPE', customType);
			Object.keys (customType.props).forEach ((propName) => {
				const destructuredPath = `${path}.${propName}`;
				const paramFromProps = {name: propName, path: destructuredPath};
				augmentParamDescription (paramFromProps, customType.props[propName]);
				console.log (destructuredPath, customType.props[propName], paramFromProps);
				jsdocParamsByPath[destructuredPath] = paramFromProps;
			});
		}
	})

	params.forEach ((param, idx) => {
		let paramJsdoc = {};
		
		// no destructuring, regular variable, param.variable means param.name
		if (param.name && jsdocParamsByPath[param.path]) {
			paramJsdoc = jsdocParamsByPath[param.path];
			augmentParamDescription (param, paramJsdoc);
			// namedParams[param.name] = param;
			return;
		}
	});

	return namedParams;
}

function parseJsdocFromComment (text) {
	const jsdoc = (commentParser ('/*' + text + '*/') || [])[0];

	// const paramByName = {};
	// const paramByNameTop = {};
	const paramsByPath = {};
	// const paramTagTree = [];

	const paramTags = [];
	let descriptionFromTag;
	let typedefTag;
	let typeTag;
	let rangeTag;
	const propTags  = [];

	let kind;
	let typedef;
	let baseType;
	const props = {};

	jsdoc.tags.forEach ((tag) => {
		if (tag.tag === 'param') {
			paramTags.push (tag);
		} else if (tag.tag === 'description') {
			descriptionFromTag = tag.source.substr (tag.tag.length + 1).trim();
		} else if (tag.tag === 'typedef') {
			typedefTag = tag;
		} else if (tag.tag === 'type') {
			typeTag = tag;
		} else if (tag.tag === 'range') {
			rangeTag = tag;
		} else if (tag.tag === 'prop' || tag.tag === 'property') {
			propTags.push (tag);
		}
	});

	let topParamIndex = -1;

	const description = jsdoc.description || descriptionFromTag;

	if (paramTags.length) {
		kind = 'params';
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
		kind = 'typedef';

		propTags.forEach ((tag, idx) => {
			props[tag.name] = tag;
		});

		typedef = new TypeDef ({
			name: typedefTag.name,
			baseType: typeTag.type || 'Object',
			props,
			range: rangeTag ? rangeTag.name : undefined,
			description,
		});
	}

	

	return {
		kind,
		baseType,
		description,

		// paramTags,
		// paramByName,
		// paramByNameTop,
		// paramTagTree,
		paramsByPath,
		
		typedef,

		tags: jsdoc.tags,
	};

}

function findTypedefs (docNodes) {
	if (!docNodes || docNodes.length === 0) {
		return;
	}

	return docNodes.filter (
		docNode => docNode.jsdoc.kind === 'typedef'
	).map (
		docNode => docNode.jsdoc.typedef
	).reduce ((typedefs, typedef) => {
		typedefs[typedef.name] = typedef;
		return typedefs;
	}, {});

}

function convertTypedefToSchema (typedef) {
	console.log (typedef);
	const required   = [];
	const properties = [];
	Object.keys(typedef.props).forEach ((propName) => {
		const prop = typedef.props[propName];
		if (!prop.optional) {
			required.push (prop.name);
		}
		// https://swagger.io/specification/#data-types
		properties.push ({
			type: prop.type, // TODO: convert to supported type
			// TODO: format?
			default: prop.default,
			description: prop.description
		});
	});
	return {
		name:        typedef.typedef,
		description: typedef.description,
		type:        typedef.baseType,
		properties,
		required,
	  };
}


/**
 * Parse source and return all found function contracts
 * @param {string} source source code
 * @param {Object} [options] parsing options
 * @returns {Array<FunContract>}
 */
export function parseSource (source, options) {
	const fnDocs = [];

	const ast = parse (source, {
		onComment (isBlock, text, start, end) {
			// jsdoc comments only appears within comment blocks
			if (!isBlock)
				return;
			if (text[0] !== '*')
				return;
			const jsdoc = parseJsdocFromComment (text);
			fnDocs.push ({
				jsdoc,
				// text,
				start,
				end
			});
		}
	});

	

	const typedefs = findTypedefs (fnDocs);
	// console.log (typedefs);
	if (typedefs && Object.keys(typedefs).length) {
		console.log ('TYPEDEFS', typedefs);
		if (typedefs.QueryWithColor) {
			console.log (convertTypedefToSchema(typedefs.QueryWithColor));
		}
	}

	let nodeIndex = 0;
	let docNodeIdx;

	// limit by top level functions only
	const fns = ast.body.map ((entity, entityIdx) => {

		let kind = 'function';
		let method;
		let path;

		if (entity.type === 'ExpressionStatement' && entity.expression.type === 'CallExpression') {
			const expr = entity.expression;
			// console.log ('CALLEE', expr.callee);
			if (expr.callee.type !== 'MemberExpression') {
				return;
			}
			method = expr.callee.property.name;
			// TODO: other methods? https://expressjs.com/en/5x/api.html#routing-methods
			if ('all get post put delete'.split(' ').includes (method)) {
				kind = 'express-handler';
			}
			

			// console.log ('ARGS', expr.arguments);
			if (!(expr.arguments.length > 1 && expr.arguments[0].type === 'Literal')) {
				return;
			}

			path = expr.arguments[0].value;

			// TODO: multiple arguments
			entity = expr.arguments[1];

		}

		if (!['FunctionDeclaration', 'ArrowFunctionExpression'].includes(entity.type)) {
			console.log (entity.type);
			return;
		}

		let name;
		if (entity.type === 'FunctionDeclaration') {
			name = entity.id.name;
		}

		const vars = getVarsFromDeclaration (entity.params);

		/** @type {FunContract} */
		const funContract = {
			name,
			// type: entity.type,
			kind, // 'function' or 'express-handler' or 'cli-handler'
			description: undefined,
			vars
		};

		docNodeIdx = findPrecedingCommentNode (
			ast.body[entityIdx],
			fnDocs,
			docNodeIdx
		);

		if (docNodeIdx === undefined) {
			console.log ('no jsdoc', fnDocs);
			return funContract;
		}
		
		// found commend which starts earlier than preceding entity end
		if (entityIdx > 0 && ast.body[entityIdx].end > fnDocs[docNodeIdx].start) {
			console.log ('found preceding jsdoc, but it is for another function');
			return funContract;
		}
		
		const fnDoc = fnDocs[docNodeIdx];

		funContract.description = fnDoc.jsdoc.description;

		// use input

		const namedParams = combineNamedParams (vars, fnDoc.jsdoc);

		funContract.named = namedParams;

		return funContract;

		commentNode.context = {
			name: ctxNode.id.name,
			type: ctxNode.type,
			params
		};

	}).filter (fn => fn);


	// fnDocs.forEach (commentNode => {

	// 	nodeIndex = findNodeIndexForComment (ast, nodeIndex, commentNode);

	// 	// TODO: filter functions?
	// 	const ctxNode = commentNode.ctxNode = ast.body[nodeIndex];

	// 	const params = parseFunctionParams (ctxNode.params);

	// 	augmentFunctionParams (params, commentNode.jsdoc);

	// 	commentNode.context = {
	// 		name: ctxNode.id.name,
	// 		type: ctxNode.type,
	// 		params
	// 	};
	// });

	return fns;
}

