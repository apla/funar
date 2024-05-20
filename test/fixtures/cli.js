// example from https://github.com/serialport/node-serialport/blob/main/packages/terminal/lib/index.ts

/**
 * List serial ports
 */
export function list () {

}

/**
 * @typedef SerialParity
 * @type {"none"|"even"|"odd"}
 */

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
export function connect ({path: p, path, b, baudrate = b ?? 9600, databits = 8, parity, logFile, logDiff = false}) {

	console.log("test: connected");

	return {path, baudrate, databits, parity};

}

/**
 * Connect to the serial port
 * @param {string}              path             serial port path
 * @param {number}              [baudrate=9600]  baudrate
 * @param {5|6|7|8}             [databits=8]     data bits
 * @param {"none"|"even"|"odd"} [parity="none"]  parity bits
 * @param {1|1.5|2}             [stopbits=1]     stop bits
 * @param {boolean}             [reconnect=true] retry connection
 * @param {boolean}             [noEcho=false]   don't print characters as you type them
 * @param {string}              [newline="LF"]   newline symbol on enter
 * @param {string}              [logFile]        log file path
 * @param {boolean}             [logDiff=false]  use diff format for log file
 */
export function connect2 (path, baudrate = 9600, databits = 8, parity, stopbits = 1, reconnect = true, noEcho = false, newline = "LF", logFile, logDiff = false) {

	return {path, baudrate, databits, parity};

}

