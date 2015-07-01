// var Base64 = require('Base64')
var capability = require('./capability')
var response = require('./response')
var stream = require('stream')
var util = require('util')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

// function copy (to, from) {
// 	if (!Array.isArray(from))
// 		from = [from]
// 	from.forEach(function (obj) {
// 		Object.keys(function (key), {
// 			to[key] = from[key]
// 		})
// 	})
// 	return to
// }

var ClientRequest = module.exports = function (opts) {
	var self = this
	stream.Writable.call(self)

	self._opts = opts
	self._body = []
	self._fullHeaders = {}
	Object.keys(opts.headers).forEach(function (name) {
		self.setHeader(name, opts.headers[name])
	})

	self._mode = capability.mode

	self.on('finish', self._onFinish.bind(self))
}

util.inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
	var self = this
	self._fullHeaders[name.toLowerCase()] = value
}

ClientRequest.prototype.getHeader = function (name) {
	var self = this
	return self._fullHeaders[name.toLowerCase()]
}

ClientRequest.prototype.removeHeader = function (name) {
	var self = this
	delete self._fullHeaders[name.toLowerCase()]
}

ClientRequest.prototype._onFinish = function () {
	var self = this

	var opts = self._opts
	var url = opts.protocol + '//' + opts.hostname +
		(opts.port ? ':' + opts.port : '') + opts.path

	var user, pass
	if (opts.auth) {
		var authMatch = opts.auth.match(/^([^:]*):(.*)$/)
		user = authMatch[0]
		pass = authMatch[1]
	}

	// process and send data
	var fullHeaders = self._fullHeaders
	var body
	if (opts.method in ['PUT', 'POST']) {
		if (typeof window.Blob === 'function') {
			body = new window.Blob(self._body.map(function (buffer) {
				return buffer.toArrayBuffer()
			}), {
				type: fullHeaders['content-type'] || ''
			})
		} else {
			// get utf8 string
			body = Buffer.concat(self._body).toString()
		}
	}

	if (self._mode === 'fetch') {
		var headers = Object.keys(fullHeaders).map(function (name) {
			return [name, fullHeaders[name]]
		})

		window.fetch(url, {
			method: self._opts.method,
			headers: headers,
			body: body,
			mode: 'cors',
			credentials: opts.credentials ? 'include' : 'omit'
		}).then(function (response) {
			self._fetchResponse = response
			self._connect()
		})
	} else {
		var xhr = self._xhr = new window.XMLHttpRequest() // TODO: old IE
		xhr.open(self._opts.method, url, true, user, pass)

		// Can't set responseType on really old browsers
		if ('responseType' in xhr)
			xhr.responseType = self._mode

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.credentials

		if (self._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		Object.keys(fullHeaders, function (name) {
			xhr.setRequestHeader(name, headers[name])
		})

		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.HEADERS_RECEIVED:
					self._connect()
					break
				case rStates.LOADING:
				case rStates.DONE:
					self._response._onXHRReadyStateChange()
					break
			}
		}

		xhr.send(body)
		// This is the best approximation to where 'socket' should be fired
		process.nextTick(function () {
			self.emit('socket')
		})
	}
}

ClientRequest.prototype._connect = function () {
	var self = this

	self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode)
	self.emit('response', self._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
	var self = this

	self._body.push(chunk)
	cb()
}

ClientRequest.prototype.abort = function () {
	var self = this
	if (self._xhr)
		self._xhr.abort()
}

ClientRequest.prototype.end = function (data, encoding, cb) {
	var self = this
	if (typeof data === 'function') {
		cb = data
		data = undefined
	}

	if (data)
		stream.Writable.push.call(self, data, encoding)

	stream.Writable.prototype.end.call(self, cb)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setTimeout = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}
