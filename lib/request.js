// var Base64 = require('Base64')
var capability = require('./capability')
var foreach = require('foreach')
var keys = require('object-keys')
var response = require('./response')
var stream = require('stream')
var util = require('util')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

function decideMode (preferBinary) {
	if (capability.fetch) {
		return 'fetch'
	} else if (capability.mozchunkedarraybuffer) {
		return 'moz-chunked-arraybuffer'
	} else if (capability.msstream) {
		return 'ms-stream'
	} else if (capability.arraybuffer && preferBinary) {
		return 'arraybuffer'
	} else if (capability.vbArray && preferBinary) {
		return 'text:vbarray'
	} else {
		return 'text'
	}
}

var ClientRequest = module.exports = function (opts) {
	var self = this
	stream.Writable.call(self)

	self._opts = opts
	self._body = []
	self._fullHeaders = {}
	foreach(keys(opts.headers), function (name) {
		self.setHeader(name, opts.headers[name])
	})

	var preferBinary
	if (opts.mode === 'prefer-streaming') {
		// If streaming is a high priority but binary compatibility isn't
		preferBinary = false
	} else if (opts.mode === 'prefer-binary') {
		// If binary compatibility is the highest priority
		preferBinary = true
	} else if (!opts.mode || opts.mode === 'default') {
		// By default, use binary if text streaming may corrupt data
		preferBinary = !capability.overrideMimeType
	} else {
		throw new Error('Invalid value for opts.mode')
	}
	self._mode = decideMode(preferBinary)

	self.on('finish', function () {
		self._onFinish()
	})
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
		var headers = keys(fullHeaders).map(function (name) {
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
			xhr.responseType = self._mode.split(':')[0]

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.credentials

		if (self._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		keys(fullHeaders, function (name) {
			xhr.setRequestHeader(name, headers[name])
		})

		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.LOADING:
					if (!self._response)
						self._connect()
					// falls through
				case rStates.DONE:
					self._response._onXHRReadyStateChange()
					break
			}
		}
		// Necessary for streaming in Firefox, since xhr.response is ONLY defined
		// in onprogress, not in onreadystatechange with xhr.readyState = 3
		if (self._mode === 'moz-chunked-arraybuffer') {
			xhr.onprogress = function () {
				self._response._onXHRReadyStateChange()
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
