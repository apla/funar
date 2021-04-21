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
		return [{path: path.toString(), ...parseASTParamNames (param.argument, path), ...{rest: true, forcedType: 'Array'}}];
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


export function getVarsFromDeclaration (astParams) {
	const params = astParams.map (parseASTParamNames).filter (p => p).reduce((acc, param) => {
		acc.push (...param);
		return acc;
	}, []);

	return params;
}
