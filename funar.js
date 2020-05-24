import commentParser from 'comment-parser';

import {parse} from 'acorn';

// https://www.npmjs.com/package/jsdoctypeparser
// https://github.com/dsheiko/bycontract
// https://github.com/joelday/vscode-docthis/blob/master/src/documenter.ts
// https://alligator.io/js/traversing-ast/

// typescript validation
// https://github.com/pelotom/runtypes

// parsing functions
// https://github.com/tunnckoCore/opensource/blob/master/packages/parse-function/test/index.js
// https://www.npmjs.com/package/cpp-function-header

// ditching typescript
// https://medium.com/@art_deco/how-to-ditch-typescript-for-jsdoc-212ff1978542
// https://github.com/artdecocode/documentary
// https://github.com/artdecocode/typal

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

function parseASTParam (astParam) {
	let {type, default: defaultVal, node: param} = getASTType (astParam);

	// regular param f(a)
	if (type === 'Identifier') {
		return {variable: param.name, ...(defaultVal ? {default: defaultVal} : {})};
	} else if (type === 'RestElement') {
		return {...parseASTParam (param.argument), ...{rest: true, forcedType: 'Array'}};
	// param with default value f(a=1)
	} else if (type === 'ObjectPattern') {
		const paramData = {object: {}, default: defaultVal}
		param.properties.forEach (prop => {
			paramData.object[prop.key.name] = parseASTParam(prop.value);
			// console.log (prop);
			// key is always
		});
		return paramData;
	} else {
		console.log (`unexpected parameter of type ${type}`);
	}
}

function parseFunctionParams (astParams) {
	const params = astParams.map (parseASTParam).filter (p => p);

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
	'description type optional default'.split (' ').forEach (
		k => jsdocParamDesc[k] !== undefined && (paramDesc[k] = paramDesc[k] || jsdocParamDesc[k])
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
	// console.log ('PARAMS', params, jsdoc.paramByNameTop, jsdoc.paramTags);

	const namedParams = {};

	// TODO: add guard for parameter count and top jsdoc @param tag count match

	params.forEach ((param, idx) => {
		let paramJsdoc = {};
		
		// no destructuring, regular variable, param.variable means param.name
		if (param.variable && jsdoc.paramByName[param.variable]) {
			paramJsdoc = jsdoc.paramByName[param.variable];
			augmentParamDescription (param, paramJsdoc);
			namedParams[param.variable] = param;
			return;
		} else if (!param.variable && jsdoc.paramTagTree[idx]) {
			paramJsdoc = jsdoc.paramTagTree[idx];

			console.log ('PARARAM', param.object, paramJsdoc);

			if ('object' in param && paramJsdoc.type === 'Object') {
				
				// TODO: add guard to ensure this is the same structure

				// console.log ('PARARAM', param.object, paramJsdoc);

				Object.keys (param.object).forEach ((k) => {
					if (paramJsdoc.subTags[k]) {
						const deepParam = param.object[k];
						augmentParamDescription (deepParam, paramJsdoc.subTags[k]);
						namedParams[param.object[k].variable] = {
							...paramJsdoc.subTags[k],
							...{name: k}
						};
					}
				});
			} 
			if (param.object && params.length === 1) {
				console.log ('PRAMPRAM', param);
			}
		}

		/*
		params[idx] = { ...{
			description: paramJsdoc.description,
			type: paramJsdoc.type,
			optional: paramJsdoc.optional,
			default: paramJsdoc.default
		}, ...param};
		*/
	});

	return namedParams;
}

function parseJsdocFromComment (text) {
	const jsdoc = (commentParser ('/*' + text + '*/') || [])[0];

	const paramByName = {};
	const paramByNameTop = {};
	const paramTagTree = [];

	const paramTags = jsdoc.tags.filter (
		tag => tag.tag === 'param'
	);

	let topParamIndex = 0;

	paramTags.forEach ((tag, idx) => {
		// paramByName[tag.name.replace (/.*\./, '')] = tag;
		paramByName[tag.name] = tag;
		const [, prefix, name] = tag.name.match (/(?:(.*)\.)?(.*)/);
		if (prefix) {
			paramByName[prefix].subTags = (paramByName[prefix].subTags || {});
			paramByName[prefix].subTags[name] = tag;
		} else {
			tag.argIndex = topParamIndex;
			topParamIndex ++;
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
		paramTagTree,
		tags: jsdoc.tags,
		description: jsdoc.description
	};

}

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
		if (entity.type !== 'FunctionDeclaration') {
			return;
		}

		docNodeIdx = findPrecedingCommentNode (
			ast.body[entityIdx],
			fnDocs,
			docNodeIdx
		);

		const params = parseFunctionParams (entity.params);

		const fnContract = {
			name: entity.id.name,
			// type: entity.type,
			params
		};

		if (docNodeIdx === undefined) {
			console.log ('no jsdoc', fnDocs);
			return fnContract;
		}
		
		// found commend which starts earlier than preceding entity end
		if (entityIdx > 0 && ast.body[entityIdx].end > fnDocs[docNodeIdx].start) {
			console.log ('jsdoc found for preceding function');
			return fnContract;
		}
		
		const fnDoc = fnDocs[docNodeIdx];

		fnContract.description = fnDoc.jsdoc.description;

		// use input

		const namedParams = combineNamedParams (params, fnDoc.jsdoc);

		fnContract.named = namedParams;

		return fnContract;

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

