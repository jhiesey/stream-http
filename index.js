var ClientRequest = require('./lib/request')
var url = require('url')
var statusCodes = require('builtin-status-codes')

var http = exports

http.request = function (opts, cb) {
	if (typeof opts === 'string')
		opts = url.parse(opts)

	opts.method = opts.method || 'GET'
	opts.headers = opts.headers || {}
	opts.protocol = opts.protocol || window.location.protocol
	opts.hostname = opts.hostname || window.location.hostname
	opts.path = opts.path || '/'
	opts.port = opts.port || parseInt(window.location.port, 10)

	// also valid: port, auth, credentials

	var req = new ClientRequest(opts)
	if (cb)
		req.on('response', cb)
	return req
}

http.get = function get (opts, cb) {
	opts.method = 'GET'
	var req = http.request(opts, cb)
	req.end()
	return req
}

http.Agent = function () {}
http.Agent.defaultMaxSockets = 4

http.STATUS_CODES = statusCodes

http.METHODS = [
	'GET',
	'POST',
	'PUT',
	'DELETE' // TODO: include the methods from RFC 2616 and 2518?
]
