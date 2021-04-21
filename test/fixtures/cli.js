/**
 * List ports
 */
function list () {

}

/**
 * Connect to the serial port
 * @param {Object}              options
 * @param {string}              options.path             serial port path
 * @param {number}              [options.baudrate=9600]  baudrate
 * @param {5|6|7|8}             [options.databits=8]     data bits
 * @param {"none"|"even"|"odd"} [options.parity="none"]  parity bits
 * @param {1|1.5|2}             [options.stopbits=1]     stop bits
 * @param {boolean}             [options.reconnect=true] retry connection
 * @param {boolean}             [options.noEcho=false]   don't print characters as you type them
 * @param {string}              [options.newline="LF"]   newline symbol on enter
 * @param {string}              [options.logFile]        log file path
 * @param {boolean}             [options.logDiff=false]  use diff format for log file
 */
function connect ({p, path = p, b = 9600, baudrate = b, logFile, logDiff}) {

	const xxx = baudrate;

}

/**
 * @typedef SerialParity
 * @union {string}
 */
const SerialParity = [
	"none",
	"even",
	"odd"
];

/**
 * @typedef SerialOptions
 * @type {Object}
 * @prop {string}              path             serial port path
 * @prop {number}              [baudrate=9600]  baudrate
 * @prop {5|6|7|8}             [databits=8]     data bits
 * @prop {SerialParity}        [parity="none"]  parity bits
 * @prop {1|1.5|2}             [stopbits=1]     stop bits
 * @prop {boolean}             [reconnect=true] retry connection
 * @prop {boolean}             [noEcho=false]   don't print characters as you type them
 * @prop {string}              [newline="LF"]   newline symbol on enter
 * @prop {string}              [logFile]        log file path
 * @prop {boolean}             [logDiff=false]  use diff format for log file
 */

app.command (
	'connect',
	/** @param {SerialOptions} options connect options */
	({p, path = p, b = 9600, baudrate = b, parity, logFile, logDiff}) => {

	const xxx = baudrate;

});
