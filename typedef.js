const typedefs = {};

/**
 * TypeDef class
 * @property {string} name type name
 * @property {string} type base type
 * @property {Object<string, any>} props props for object type
 */
export class TypeDef {
	name;
	type;
	props;
	/**
	 * Lookup definitions by name
	 * @param {Object} o lookup properties
	 * @param {string} o.name lookup by name
	 * @returns {TypeDef}
	 */
	static lookup ({name}) {
		const typedef = typedefs[name];

		if (!typedef)
			return;

		console.log ('LOOKUP', typedef.name);

		if (typedef.type === 'Object') {
			// TODO: circular
			const newProps = {};
			Object.keys(typedef.props).forEach ((propName) => {
				const prop = typedef.props[propName];
				const customType = TypeDef.lookup ({name: prop.type});
				if (customType) {
					newProps[propName] = {...customType, ...prop, type: customType.type, wrapType: prop.type};
				} else {
					newProps[propName] = {...prop};
				}
				// console.log ('LOOKUP', prop, customType);
			});
			return {...typedef, props: newProps};
		} else {
			return typedef;
		}
	}
	/**
	 * TypeDef constructor
	 * @constructor
	 * @param {Object} o options
	 * @param {string}      o.name type name
	 * @param {string} [o.baseType='Object'] base type
	 * @param {Object} [o.props] props for object type
	 * @param {*}      [o.range] acceptable value range
	 */
	constructor ({name, baseType = 'Object', props, range}) {
		this.name  = name;
		this.type  = baseType;
		this.props = props;

		if (range !== undefined) {
			let rangeStart, rangeEnd;
			const rangeMatch = range.match (/^(?:(\d+)?\D(\d+)?)$/);
			if (range.length > 1 && rangeMatch) {
				rangeStart = rangeMatch[1];
				rangeEnd   = rangeMatch[2];
				// TODO: make sure range start is less or equal than range end
			} else if (range.match (/^\d+$/)) {
				rangeStart = rangeEnd = parseInt (range, 10);
			}
			if (baseType === 'string') {
				this.minLength = rangeStart;
				this.maxLength = rangeEnd;
			} else if (baseType === 'number') {
				this.minimum = rangeStart;
				this.maximum = rangeEnd;
			} else if (baseType.startsWith('Array') || baseType.endsWith('[]')) {
				this.minItems = rangeStart;
				this.maxItems = rangeEnd;
			} else if (baseType.startsWith('Object') || baseType.endsWith('{}')) {
				this.minProperties = rangeStart;
				this.maxProperties = rangeEnd;
			}
		}

		typedefs[this.name] = this;
	}
	exportToOpenAPI () {
		const required   = [];
		const properties = [];
		Object.keys(this.props).forEach ((propName) => {
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
}