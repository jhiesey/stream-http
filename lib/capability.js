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

var arrayBufferGood = util.isFunction(window.ArrayBuffer) && util.isFunction(window.ArrayBuffer.prototype.slice)

exports.arraybuffer = arrayBufferGood && checkTypeSupport(xhr, 'arraybuffer')
exports.msstream = arrayBufferGood && checkTypeSupport(xhr, 'ms-stream')
exports.mozchunkedarraybuffer = arrayBufferGood && checkTypeSupport('moz-chunked-arraybuffer')
exports.overrideMimeType = util.isFunction(xhr.overrideMimeType)

xhr = null // Help gc
