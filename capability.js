var util = require('util')

exports.fetch = util.isFunction(window.fetch)

function checkTypeSupport (type) {
	var xhr = new XMLHttpRequest()
	xhr.open('GET', '/')
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false;
}

exports.arraybuffer = checkTypeSupport('arraybuffer')
exports.msstream = checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = checkTypeSupport('moz-chunked-arraybuffer')

/*if (exports.fetch) {
	exports.mode = 'fetch'
} else*/ if (exports.mozchunkedarraybuffer) {
	exports.mode = 'moz-chunked-arraybuffer'
} else if (exports.msstream) {
	exports.mode = 'ms-stream'
// } else if (exports.arraybuffer) {
// 	exports.mode = 'arraybuffer'
} else {
	exports.mode = 'text'
}
