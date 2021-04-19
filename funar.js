import commentParser from 'comment-parser';

import {parse} from 'acorn';

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
 * Get AST node regardless of default value
 */
function getASTType (astNode) {
	let type = astNode.type;
	let node = astNode;
	let defaultVal = undefined;
	if (astNode.type === 'AssignmentPattern') {
		type = astNode.left.type;
		node = astNode.left;
		defaultVal = astNode.right.value;
	}

	return {
		type,
		node,
		default: defaultVal
	}
}

function parseASTParamTree (astParam) {
	let {type, default: defaultVal, node: param} = getASTType (astParam);

	// regular param f(a)
	if (type === 'Identifier') {
		return {variable: param.name, ...(defaultVal ? {default: defaultVal} : {})};
	} else if (type === 'RestElement') {
		return {...parseASTParamTree (param.argument), ...{rest: true, forcedType: 'Array'}};
	// param with default value f(a=1)
	} else if (type === 'ObjectPattern') {
		const paramData = {object: {}, default: defaultVal}
		param.properties.forEach (prop => {
			paramData.object[prop.key.name] = parseASTParamTree(prop.value);
			// console.log (prop);
			// key is always
		});
		return paramData;
	} else {
		console.log (`unexpected parameter of type ${type}`);
	}
}

/**
 * 
 * @param {*} astParam 
 * @param {string|number} path position or destructuring locator
 * @returns {FunParameter[]}
 */
function parseASTParamNames (astParam, path) {
	let {type, default: defaultVal, node: param} = getASTType (astParam);

	// regular param f(a)
	if (type === 'Identifier') {
		return [{name: param.name, path: path.toString(), ...(defaultVal ? {default: defaultVal} : {})}];
	} else if (type === 'RestElement') {
		return [{path: path.toString(), ...parseASTParamNames (param.argument), ...{rest: true, forcedType: 'Array'}}];
	// param with default value f(a=1)
	} else if (type === 'ObjectPattern') {
		const result = [];
		param.properties.forEach (prop => {
			const propPath = `${path}.${prop.key.name}`;
			const {type: propValType, default: propValDefaultVal, node: propValNode} = getASTType (prop.value);
			if (propValType === 'Identifier') {
				result.push ({
					name: propValNode.name,
					path: propPath,
					...(propValDefaultVal ? {default: propValDefaultVal} : {})
				});
			} else if (propValType === 'ObjectPattern') {
				result.push (...parseASTParamNames(propValNode, propPath));
			}
			// key is always
		});
		return result;
	} else {
		console.log (`unexpected parameter of type ${type}`);
	}
}


/**
 * 
 */
// app.get ('/', ({path, params: {scope: apiScope = 'global', method: apiMethod}, query: {color: queryColor}}) => {
// 	return displayName + ' is ' + name;
// });


function getVarsFromDeclaration (astParams) {
	const params = astParams.map (parseASTParamNames).filter (p => p).reduce((acc, param) => {
		acc.push (...param);
		return acc;
	}, []);

	return params;
}

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
		&& (docNodes[docNodeIdx + 1].end < currNode.start)
	) {
		docNodeIdx ++;
	}

	return docNodeIdx > -1 ? docNodeIdx : undefined;

}

function augmentParamDescription (paramDesc, jsdocParamDesc) {
	const rename = {optional: 'isOptional'};
	'description type optional default'.split (' ').forEach (
		k => jsdocParamDesc[k] !== undefined && (paramDesc[rename[k] || k] = paramDesc[k] || jsdocParamDesc[k])
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



	params.forEach ((param, idx) => {
		let paramJsdoc = {};
		
		// no destructuring, regular variable, param.variable means param.name
		if (param.name && jsdoc.paramsByPath[param.path]) {
			paramJsdoc = jsdoc.paramsByPath[param.path];
			augmentParamDescription (param, paramJsdoc);
			// namedParams[param.name] = param;
			return;
		}
	});

	return namedParams;
}

function parseJsdocFromComment (text) {
	const jsdoc = (commentParser ('/*' + text + '*/') || [])[0];

	const paramByName = {};
	const paramByNameTop = {};
	const paramsByPath = {};
	const paramTagTree = [];

	const paramTags = jsdoc.tags.filter (
		tag => tag.tag === 'param'
	);

	let topParamIndex = -1;

	paramTags.forEach ((tag, idx) => {
		// paramByName[tag.name.replace (/.*\./, '')] = tag;
		paramByName[tag.name] = tag;
		const [, prefix, name] = tag.name.match (/(?:(.*)\.)?(.*)/);
		if (prefix) {
			paramByName[prefix].subTags = (paramByName[prefix].subTags || {});
			paramByName[prefix].subTags[name] = tag;
			// for destructured object JSDoc have named positional parameter,
			// but function declaration have no name, only position.
			// we need to replace first path chunk before dot to parameter index
			paramsByPath[`${topParamIndex}.${tag.name.replace(/^[^\.]+\./, '')}`] = tag;
		} else {
			topParamIndex ++;
			tag.argIndex = topParamIndex;
			paramsByPath['' + topParamIndex] = tag;
			paramByNameTop[tag.name] = tag;
			paramTagTree.push (tag);
		}
	}
	//).filter (
		// remove object params internal fields
	//	tag => !tag.name.match (/\./)
	);

	

	return {
		paramTags,
		paramByName,
		paramByNameTop,
		paramsByPath,
		paramTagTree,
		tags: jsdoc.tags,
		description: jsdoc.description
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

	let nodeIndex = 0;
	let docNodeIdx;

	// limit by top level functions only
	const fns = ast.body.map ((entity, entityIdx) => {

		let kind = 'function';
		let method;
		let path;

		if (entity.type === 'ExpressionStatement' && entity.expression.type === 'CallExpression') {
			const expr = entity.expression;
			console.log ('CALLEE', expr.callee);
			if (expr.callee.type !== 'MemberExpression') {
				return;
			}
			method = expr.callee.property.name;
			// TODO: other methods? https://expressjs.com/en/5x/api.html#routing-methods
			if (method in 'all get post put delete'.split(' ')) {
				kind = 'express-handler';
			}
			

			console.log ('ARGS', expr.arguments);
			if (!(expr.arguments.length === 2 && expr.arguments[0].type === 'Literal')) {
				return;
			}

			path = expr.arguments[0].value;

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
			kind: 'function', // or 'express-handler' or 'cli-handler'
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

