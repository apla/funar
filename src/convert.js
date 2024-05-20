/**
 * @param {string} str string to parse
 * @returns {number|undefined}
 */
export function parseFloatFromString (str) {
	const value = parseFloat(str);
	if (isNaN(value)) {
		return undefined;
	}
	return value;
}

/**
 *
 * @param {string} str string to parse
 * @returns {bigint|undefined}
 */
export function parseBigIntFromString (str) {
	try {
		return BigInt(str);
	} catch (e) {
		return undefined;
	}
}
