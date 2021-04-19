function x (a, b, c) {

}

/**
 * Search handler
 * @param {Object}              req              request
 * @param {"POST"}              req.method       request method
 * @param {Object}              req.body         request body
 * @param {string}              req.body.search  `search` parameter
 * @param {number}              [req.body.start] `offset` parameter
 * @param {number}              [req.body.limit] `limit` parameter
 * @param {Object}              res              response
 */
function search ({body: {search, start=0, limit=10}}, res) {

	x(search, start, limit);

	res.sendStatus(200);
}

/**
 * Search handler
 * @param {Object}              req              request
 * @param {"POST"|"GET"}        req.method       request method
 * @param {Object}              req.body         request body
 * @param {Object}              req.body.search  `search` parameter
 * @param {Object}              req.body.start   `offset` parameter
 * @param {Object}              req.body.limit   `limit` parameter
 * @param {Object}              res              response
 */
function search ({body: {search, start, limit}}, res) {
	res.sendStatus(200);
}