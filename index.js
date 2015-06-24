var ClientRequest = require('./request')
var url = require('url')
var util = require('util')

exports.request = function request (opts, cb) {
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

exports.get = function get (opts, cb) {
	opts.method = 'GET'
	var req = request(opts, cb)
	req.end()
	return req
}

