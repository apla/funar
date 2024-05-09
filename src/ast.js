// https://github.com/acornjs/acorn/issues/1136
/* * @typedef {import('node-estree').ESTree} ESTree */
// import * as ESTree from 'estree';
import * as acorn from "acorn";

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
	let name, type, alias, defaultVal;

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

		if (astParam.left.type === "Identifier") {
			if (astParam.right.type === 'Literal') {
				defaultVal = astParam.right.value;
			} else if (astParam.right.type === 'Identifier') {
				alias = astParam.right.name;
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
				isOptional: true,
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

	/** @type {Object<string,FunParameter>} */
	const params = astParams.map (parseASTParamNames).reduce((acc, paramList) => {
		paramList.map((param) => {
			acc[param.name] = {...param};
		});
		
		return acc;
	}, {});

	return params;
}
