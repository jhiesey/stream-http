var util = require('util')

exports.fetch = util.isFunction(window.fetch)

function checkTypeSupport (xhr, type) {
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false
}

var xhr = new window.XMLHttpRequest()
xhr.open('GET', '/')

exports.arraybuffer = checkTypeSupport('arraybuffer')
exports.msstream = checkTypeSupport('ms-stream') && util.isFunction(ArrayBuffer.prototype.slice)
exports.mozchunkedarraybuffer = checkTypeSupport('moz-chunked-arraybuffer')
exports.overrideMimeType = util.isFunction(xhr.overrideMimeType)

xhr = null // Help gc

// exports.getMode = function (preferBinary) {
// 	if (exports.fetch) {
// 		exports.mode = 'fetch'
// 	} else if (exports.mozchunkedarraybuffer) {
// 		exports.mode = 'moz-chunked-arraybuffer'
// 	} else if (exports.msstream) {
// 		exports.mode = 'ms-stream'
// 	} else if (exports.arraybuffer && preferBinary) {
// 		exports.mode = 'arraybuffer'
// 	} else {
// 		exports.mode = 'text'
// 	}
// }

/*
// correctness: might need binary
// speed: might want binary

// normally, stream if correctness not affected. If force stream, . If force, ignore correctness

// force stream 			Use text
// prefer stream 			Use text if overridemimetype is available
// force binary (speedy)	Use binary

*/