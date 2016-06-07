var capability = require('./capability')
var inherits = require('inherits')
var response = require('./response')
var stream = require('readable-stream')
var toArrayBuffer = require('to-arraybuffer')

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
	stream.Writable.call(this)

	this._opts = opts
	this._body = []
	this._headers = {}

  ///using _notdestroyed for successfull cleaning in destroy: will set this._notdestroyed to null in order to release variable and will be false of if's .... 
  this._notdestroyed = true 
  this._xhr = null
  this._response = null
	if (opts.auth)
		this.setHeader('Authorization', 'Basic ' + new Buffer(opts.auth).toString('base64'))
	Object.keys(opts.headers).forEach(function (name) {
		this.setHeader(name, opts.headers[name])
	})

	var preferBinary
	if (opts.mode === 'prefer-streaming') {
		// If streaming is a high priority but binary compatibility and
		// the accuracy of the 'content-type' header aren't
		preferBinary = false
	} else if (opts.mode === 'allow-wrong-content-type') {
		// If streaming is more important than preserving the 'content-type' header
		preferBinary = !capability.overrideMimeType
	} else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
		// Use binary if text streaming may corrupt data or the content-type header, or for speed
		preferBinary = true
	} else {
		throw new Error('Invalid value for opts.mode')
	}
	this._mode = decideMode(preferBinary)

	this.on('finish', this._onFinish.bind(this));
}

inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
	var lowerName = name.toLowerCase()
	// This check is not necessary, but it prevents warnings from browsers about setting unsafe
	// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
	// http-browserify did it, so I will too.
	if (unsafeHeaders.indexOf(lowerName) !== -1)
		return

	this._headers[lowerName] = {
		name: name,
		value: value
	}
}

ClientRequest.prototype.getHeader = function (name) {
	return this._headers[name.toLowerCase()].value
}

ClientRequest.prototype.removeHeader = function (name) {
	delete this._headers[name.toLowerCase()]
}

function _toArrayBuffer(buffer) {
  return toArrayBuffer(buffer)
}

function _onFetchSuccess (cr, response){
  cr._fetchResponse = response
  cr._connect()
}

ClientRequest.prototype._onFinish = function () {
	if (!this._notdestroyed)
		return
	var opts = this._opts

	var headersObj = this._headers
	var body
	if (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'PATCH') {
		if (capability.blobConstructor) {
			body = new global.Blob(this._body.map(_toArrayBuffer), {
				type: (headersObj['content-type'] || {}).value || ''
			})
		} else {
			// get utf8 string
			body = Buffer.concat(this._body).toString()
		}
	}

	if (this._mode === 'fetch') {
		var headers = Object.keys(headersObj).map(function (name) {
			return [headersObj[name].name, headersObj[name].value]
		})

		global.fetch(this._opts.url, {
			method: this._opts.method,
			headers: headers,
			body: body,
			mode: 'cors',
			credentials: opts.withCredentials ? 'include' : 'same-origin'
		}).then(_onFetchSuccess.bind(null, this)), this.emit.bind(this, 'error');
	} else {
		var xhr = this._xhr = new global.XMLHttpRequest()
		try {
			xhr.open(this._opts.method, this._opts.url, true)
		} catch (err) {
			process.nextTick(this.emit.bind(this, 'error', err));
			return
		}

		// Can't set responseType on really old browsers
		if ('responseType' in xhr)
			xhr.responseType = this._mode.split(':')[0]

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.withCredentials

		if (this._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		Object.keys(headersObj).forEach(function (name) {
			xhr.setRequestHeader(headersObj[name].name, headersObj[name].value)
		})

		this._response = null
		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.LOADING:
				case rStates.DONE:
					this._onXHRProgress()
					break
			}
		}
		// Necessary for streaming in Firefox, since xhr.response is ONLY defined
		// in onprogress, not in onreadystatechange with xhr.readyState = 3
		if (this._mode === 'moz-chunked-arraybuffer') {
			xhr.onprogress = this._onXHRProgress.bind(this);
		}

		xhr.onerror = this._onError.bind(this); 

		try {
			xhr.send(body)
		} catch (err) {
			process.nextTick(this.emit.bind(this, 'error', err));
			return
		}
	}
}

ClientRequest.prototype._onError = function () {
  if (!this._notdestroyed)
    return
  this.emit('error', new Error('XHR error'))

};

/**
 * Checks if xhr.status is readable and non-zero, indicating no error.
 * Even though the spec says it should be available in readyState 3,
 * accessing it throws an exception in IE8
 */
function statusValid (xhr) {
	try {
		var status = xhr.status
		return (status !== null && status !== 0)
	} catch (e) {
		return false
	}
}

ClientRequest.prototype._onXHRProgress = function () {
	if (!statusValid(this._xhr) || !this._notdestroyed)
		return

	if (!this._response)
		this._connect()

	this._response._onXHRProgress()
}

ClientRequest.prototype._connect = function () {
	if (!this._notdestroyed)
		return

	this._response = new IncomingMessage(this._xhr, this._fetchResponse, this._mode)
	this.emit('response', this._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
	this._body.push(chunk)
	cb()
}

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
	this._notdestroyed = null
	if (this._response)
		this._response._destroyed = true
	if (this._xhr)
		this._xhr.abort()

/*
  this._body = null;
  this._headers = null;
  this._xhr = null;
  this._response = null;
  this._opts = null;
  this._mode = null;
*/
	// Currently, there isn't a way to truly abort a fetch.
	// If you like bikeshedding, see https://github.com/whatwg/fetch/issues/27
}

ClientRequest.prototype.end = function (data, encoding, cb) {
	if (typeof data === 'function') {
		cb = data
		data = undefined
	}

	stream.Writable.prototype.end.call(this, data, encoding, cb)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setTimeout = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'cookie',
	'cookie2',
	'date',
	'dnt',
	'expect',
	'host',
	'keep-alive',
	'origin',
	'referer',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'user-agent',
	'via'
]
