var capability = require('./capability')
var inherits = require('inherits')
var stream = require('readable-stream')

var rStates = exports.readyStates = {
	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4
}

function _onRead(im, reader, result) {
	if (im._destroyed)
		return
	if (result.done) {
		im.push(null)
		return
	}
	im.push(new Buffer(result.value))
	read(im, reader)
}

function read (im, reader) {
	reader.read().then(_onRead.bind(null, im, reader));
}

function traverseHeaders (im, header) {
  var matches = header.match(/^([^:]+):\s*(.*)/)
  if (matches) {
    var key = matches[1].toLowerCase()
    if (key === 'set-cookie') {
      if (im.headers[key] === undefined) {
        im.headers[key] = []
      }
      im.headers[key].push(matches[2])
    } else if (im.headers[key] !== undefined) {
      im.headers[key] += ', ' + matches[2]
    } else {
      im.headers[key] = matches[2]
    }
    im.rawHeaders.push(matches[1], matches[2])
  }
}

function onProgress (im, reader) {
  if (reader.result.byteLength > im._pos) {
    im.push(new Buffer(new Uint8Array(reader.result.slice(im._pos))))
    im._pos = reader.result.byteLength
  }
}

function onLoad (im) {
  im.push(null)
}

var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode) {
	stream.Readable.call(this)

	this._mode = mode
	this.headers = {}
	this.rawHeaders = []
	this.trailers = {}
	this.rawTrailers = []
  this._pos = null;
  this._xhr = null;

	// Fake the 'close' event, but only once 'end' fires
  // The nextTick is necessary to prevent the 'request' module from causing an infinite loop
	this.on('end', process.nextTick.bind(process, this.emit.bind(this, 'close')))

	if (mode === 'fetch') {
		this._fetchResponse = response

		this.url = response.url
		this.statusCode = response.status
		this.statusMessage = response.statusText
		// backwards compatible version of for (<item> of <iterable>):
		// for (var <item>,_i,_it = <iterable>[Symbol.iterator](); <item> = (_i = _it.next()).value,!_i.done;)
		for (var header, _i, _it = response.headers[Symbol.iterator](); header = (_i = _it.next()).value, !_i.done;) {
			this.headers[header[0].toLowerCase()] = header[1]
			this.rawHeaders.push(header[0], header[1])
		}

		// TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
		var reader = response.body.getReader()
		read(this, reader)

	} else {
		this._xhr = xhr
		this._pos = 0

		this.url = xhr.responseURL
		this.statusCode = xhr.status
		this.statusMessage = xhr.statusText
		var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
		headers.forEach(traverseHeaders.bind(null, this));

		this._charset = 'x-user-defined'
		if (!capability.overrideMimeType) {
			var mimeType = this.rawHeaders['mime-type']
			if (mimeType) {
				var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
				if (charsetMatch) {
					this._charset = charsetMatch[1].toLowerCase()
				}
			}
			if (!this._charset)
				this._charset = 'utf-8' // best guess
		}
	}
}

inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {}

IncomingMessage.prototype._onXHRProgress = function () {
	var xhr = this._xhr

	var response = null
	switch (this._mode) {
		case 'text:vbarray': // For IE9
			if (xhr.readyState !== rStates.DONE)
				break
			try {
				// This fails in IE8
				response = new global.VBArray(xhr.responseBody).toArray()
			} catch (e) {}
			if (response !== null) {
				this.push(new Buffer(response))
				break
			}
			// Falls through in IE8	
		case 'text':
			try { // This will fail when readyState = 3 in IE9. Switch mode and wait for readyState = 4
				response = xhr.responseText
			} catch (e) {
				this._mode = 'text:vbarray'
				break
			}
			if (response.length > this._pos) {
				var newData = response.substr(this._pos)
				if (this._charset === 'x-user-defined') {
					var buffer = new Buffer(newData.length)
					for (var i = 0; i < newData.length; i++)
						buffer[i] = newData.charCodeAt(i) & 0xff

					this.push(buffer)
				} else {
					this.push(newData, this._charset)
				}
				this._pos = response.length
			}
			break
		case 'arraybuffer':
			if (xhr.readyState !== rStates.DONE)
				break
			response = xhr.response
			this.push(new Buffer(new Uint8Array(response)))
			break
		case 'moz-chunked-arraybuffer': // take whole
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING || !response)
				break
			this.push(new Buffer(new Uint8Array(response)))
			break
		case 'ms-stream':
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING)
				break
			var reader = new global.MSStreamReader()
      reader.onprogress = onProgress.bind(null, this, reader);
			reader.onload = onLoad.bind(null, this)

			// reader.onerror = ??? // TODO: this
			reader.readAsArrayBuffer(response)
			break
	}

	// The ms-stream case handles end separately in reader.onload()
	if (this._xhr.readyState === rStates.DONE && this._mode !== 'ms-stream') {
		this.push(null)
	}
}
