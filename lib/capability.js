var util = require('util')

exports.fetch = util.isFunction(window.fetch) && util.isFunction(window.ReadableByteStream)

var xhr = new window.XMLHttpRequest()
xhr.open('GET', '/')

function checkTypeSupport (type) {
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false
}

var haveArrayBuffer = util.isFunction(window.ArrayBuffer)
var haveSlice = haveArrayBuffer && util.isFunction(window.ArrayBuffer.prototype.slice)

exports.arraybuffer = haveArrayBuffer && checkTypeSupport('arraybuffer')
exports.msstream = haveSlice && checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = haveArrayBuffer && checkTypeSupport('moz-chunked-arraybuffer')
exports.overrideMimeType = util.isFunction(xhr.overrideMimeType)

xhr = null // Help gc
