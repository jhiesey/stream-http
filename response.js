var stream = require('stream')
var util = require('util')

var rStates = exports.readyStates = {
	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4
}

var IncomingMessage = exports.IncomingMessage = function (xhr, fetchResponse, mode) {
	var self = this
	stream.Readable.call(self)

	self._mode = mode
	self.headers = {}
	self.rawHeaders = []
	self.trailers = {}
	self.rawTrailers = []

	if (mode === 'fetch') {
		self._fetchResponse = fetchResponse

		self.statusCode = response.status
		self.statusMessage = response.statusText
		// backwards compatible version of for (<item> of <iterable>):
		// for (var <item>,_i,_it = <iterable>[Symbol.iterator](); <item> = (_i = _it.next()).value,!_i.done;)
		for (var header,_i,_it = response.headers[Symbol.iterator](); header = (_i = _it.next()).value,!_i.done;) {
			self.headers[header[0].toLowerCase()] = header[1]
			self.rawHeeaders.push(header)
		}

		// TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
		var reader = response.body.getReader()
		reader.read().then(function (result) {
			if (result.done) {
				self.push(null)
				self.emit('close')
				return
			}
			self.push(new Buffer(result.value))
		})

	} else {
		self._xhr = xhr
		self._pos = 0

		self.statusCode = xhr.status
		self.statusMessage = xhr.statusText.match('/^[0-9]{3} (.*)$')[1]
		var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
		headers.forEach(function (header) {
			var matches = header.match(/^([^:]+):\s*(.*)/)
			if (matches) {
				var key = matches[1].toLowerCase()
				self.headers[key.toLowerCase()] = matches[2] // TODO: some headers should use commas, some arrays
				self.rawHeaders.push(matches[1], matches[2])
			}
		})

		self._charset = 'x-user-defined'
		if (typeof xhr.overrideMimeType !== 'function') {
			var mimeType = self.rawHeaders['mime-type']
			if (mimeType) {
				var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
				if (charsetMatch) {
					self._charset = charsetMatch[1].toLowerCase()
				}
			}
			if (!self._charset)
				self._charset = 'utf-8' // best guess
		}
	}
}

util.inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {}

IncomingMessage.prototype._onXHRReadyStateChange = function () {
	var self = this

	var xhr = self._xhr

	switch (self._mode) {
		case 'text': // slice
			if (xhr.response.length > self._pos) {
				var newData = xhr.response.substr(self._pos)
				if (self._charset === 'x-user-defined') {
					var buffer = new Buffer(newData.length)
					for (var i = 0; i < newData.length; i++)
						buffer[i] = newData.charCodeAt(i)

					self.push(buffer)
				} else {
					self.push(newData, self._charset)
				}
				self._pos = xhr.response.length
			}
			break
		case 'moz-chunked-arraybuffer': // take whole
			if (xhr.readyState !== rStates.LOADING)
				break
			self.push(new Buffer(xhr.response))
			break
		case 'ms-stream':
			// 
			if (xhr.readyState !== rStates.LOADING)
				break
			var reader = new MSStreamReader()
			reader.onprogress = function () {
				if (reader.result.byteLength > self._pos) {
					self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos))))
					self._pos = reader.result.byteLength
				}
			}
			reader.onload = function () {
				self.push(null)
				self.emit('close')
			}
			// reader.onerror = ??? // TODO: this
			reader.readAsArrayBuffer(xhr.response)
			break
	}

	// The ms-stream case handles end separately in reader.onload()
	if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
		self.push(null)
		self.emit('close')
	}
}
