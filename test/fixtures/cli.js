/**
 * List ports
 */
function list () {

}

/**
 * Connect to the serial port
 * @param {Object}              options
 * @param {string}              options.path            serial port path
 * @param {number}              [options.baudrate=9600] baudrate
 * @param {5|6|7|8}             [options.databits=8]    data bits
 * @param {"none"|"even"|"odd"} [options.parity="none"] parity bits
 * @param {1|1.5|2}             [options.stopbits=1]    stop bits
 * @param {boolean}             [options.reconnect=true] retry connection
 * @param {boolean}             [options.noEcho=false]  don't print characters as you type them
 * @param {string}              [options.newline="LF"]  newline symbol on enter
 * @param {string}              [options.logFile]       log file path
 * @param {boolean}             [options.logDiff=false] use diff format for log file
 */
function connect ({path: p, baudrate: b = 9600, logFile, logDiff}) {

	const [baudrate, path] = [b, p];

	const xxx = baudrate;

}