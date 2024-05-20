// https://github.com/acornjs/acorn/issues/1136
/* * @typedef {import('node-estree').ESTree} ESTree */
// import * as ESTree from 'estree';
import * as acorn from "acorn";
const parse = acorn.parse;

/** @typedef {import('./funar.js').FunParameter} FunParameter */

/**
 * Get AST node regardless of default value
 * @param {acorn.Pattern} astNode
 */
 function getASTType (astNode) {
	/** @type {string|undefined} */
	let name = astNode.type === 'Identifier' ? astNode.name : undefined;
	/** @type {string} */
	let type = astNode.type;
	/** @type {acorn.Pattern} */
	let node = astNode;
	let defaultVal = undefined;
	let alias = undefined;

	return {
		name,
		type,
		node,
		...{alias, defaultVal},
	}
}

/**
 * Parse single parameter from function declaration
 * @param {acorn.Pattern} astParam
 * @param {string|number} path position or destructuring locator
 * @returns {FunParameter[]}
 */
function parseASTParamNames (astParam, path) {
	let name, type, alias, defaultVal, isOptional;

	// regular param f(a)
	if (astParam.type === 'Identifier') {
		return [{
			name: astParam.name,
			// ...{alias},
			path: path.toString(),
		}];
	} else if (astParam.type === 'RestElement') {
		return [{
			...parseASTParamNames(astParam.argument, path)[0],
			...{rest: true, forcedType: 'Array'}
		}];

	} else if (astParam.type === 'ObjectPattern') {
		/** @type {FunParameter[]} */
		const result = [];
		astParam.properties.forEach (prop => {
			if (prop.type === 'RestElement') return;
			// sometimes it is {key: "value"}, but sometimes it is {"key": "value"}
			// @ts-ignore TODO: add more type guards
			const propPath = `${path}.${prop.key.name ?? (prop.key.value.includes(".") ? prop.key.raw : prop.key.value)}`;

			const parsedPropValue = parseASTParamNames(prop.value, propPath);

			result.push(...parsedPropValue);
		});
		return result;
	// param with default value f(a=1)
	} else if (astParam.type === 'AssignmentPattern') {

		const parsedLeftPart = parseASTParamNames(astParam.left, path);

		isOptional = true;

		if (astParam.left.type === "Identifier") {
			if (astParam.right.type === 'Literal') {
				defaultVal = astParam.right.value;
			} else if (astParam.right.type === 'Identifier') {
				alias = astParam.right.name;
				isOptional = false;
			} else if ( // param = _param ?? defaultValue | left = _left ?? _right
				astParam.right.type === 'LogicalExpression'
				&& astParam.right.operator === '??'
				&& astParam.right.left.type === 'Identifier'
				&& astParam.right.right.type === 'Literal'
			) {
				defaultVal = astParam.right.right.value;
				alias = astParam.right.left.name;
			}
			return [{
				...parsedLeftPart[0],
				alias,
				default: defaultVal,
				isOptional,
			}]
		}

		return parsedLeftPart;

	} else {
		console.warn (`unexpected parameter of type ${type}`);
		return [];
	}
}


/**
 * Parse all parameters from function declaration
 * @param {acorn.Pattern[]} astParams
 * @returns {Object<string,FunParameter>}
 */
export function getVarsFromDeclaration (astParams) {

	const paths = {};

	/** @type {Object<string,FunParameter>} */
	const params = astParams.map (parseASTParamNames).reduce((acc, paramList) => {
		paramList.map((param) => {
			acc[param.name] = {...param};
			// to support multiple destructured vars with the same path, but different var name,
			// such as ({path: p, path}) => {}
			if (paths[param.path]) {

				const prevParam = paths[param.path];

				if (param.path.match(`\\.${prevParam.name}$`)) {
					acc[prevParam.name].alias = param.name;
					delete acc[param.name];
					return;
				} else if (param.path.match(`\\.${param.name}$`)) {
					acc[param.name].alias = prevParam.name;
					delete acc[prevParam.name];
				}
			}

			// for a case ({b, bbb = b}) => {}
			if (acc[acc[param.name].alias]) {
				delete acc[acc[param.name].alias];
			}

			paths[param.path] = param;
		});

		return acc;
	}, {});

	return params;
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
 * Acorn onComment callback
 * @callback onCommentCb
 * @param {boolean} isBlock
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @param {acorn.Position} [startLoc]
 * @param {acorn.Position} [endLoc]
 */

/**
 * @typedef FunAstMeta
 * @type {Object}
 * @prop {string} name                      function name
 * @prop {Object<string,FunParameter>} vars function variables metadata
 * @prop {Object} pos                       function source position
 * @prop {number} pos.start                 function position start
 * @prop {number} pos.end                   function position end
 * @prop {number | undefined} pos.prev      preceding function position end
 */

/**
 * Retrieve all functions with their variables from destructured parameters of function declarations
 * @param {string} source js file contents
 * @param {onCommentCb} onComment on comment callback
 * @returns {FunAstMeta[]}
 */
export function getVarsFromSource (source, onComment) {
	const ast = parse (source, {
		onComment,
		ecmaVersion: 'latest',
		locations: true,
		allowImportExportEverywhere: true,
	});

	const astMeta = ast.body.map ((entity, entityIdx) => {

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

		return {
			name,
			vars,
			pos: {
				prev: entityIdx > 0 ? ast.body[entityIdx - 1].end : undefined,
				start: entity.start,
				end: entity.end,
			}
		}
	}).filter(item => item !== undefined);

	return astMeta;
}
