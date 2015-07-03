var Buffer = require('buffer').Buffer
var fs = require('fs');
var test = require('tape')
var UAParser = require('ua-parser-js')

var browserType = (new UAParser()).setUA(navigator.userAgent).getBrowser()
// Binary data gets corrupted in IE8 or below
var skipVerification = (browserType.name === 'IE' && browserType.major <= 8)

var reference = fs.readFileSync(__dirname + '/../server/static/browserify.png');

var http = require('../..')

test('binary download', function (t) {
	http.get('/browserify.png', function (res) {
		var buffers = []

		res.on('end', function () {
			if (skipVerification)
				t.skip('binary data not preserved on IE <= 8')
			else
				t.ok(reference.equals(Buffer.concat(buffers)), 'contents match')
			t.end()
		})

		res.on('data', function (data) {
			buffers.push(data)
		})
	})
})