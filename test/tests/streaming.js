var Buffer = require('buffer').Buffer
var fs = require('fs');
var test = require('tape')
var UAParser = require('ua-parser-js')

var browserType = (new UAParser()).setUA(navigator.userAgent).getBrowser()
// Streaming doesn't work in IE8 or below
var skipStreamingCheck = (browserType.name === 'IE' && browserType.major <= 8)

var COPIES = 1000
var MIN_PIECES = 5

var referenceOnce = fs.readFileSync(__dirname + '/../server/static/basic.txt');
var reference = new Buffer(referenceOnce.length * COPIES)
reference.fill(referenceOnce)

var http = require('../..')

test('text streaming', function (t) {
	http.get({
		path: '/basic.txt?copies=' + COPIES,
		mode: 'prefer-streaming'
	}, function (res) {
		var buffers = []

		res.on('end', function () {
			if (skipStreamingCheck)
				t.skip('streaming not available on IE <= 8')
			else
				t.ok(buffers.length >= MIN_PIECES, 'received in multiple parts')
			t.ok(reference.equals(Buffer.concat(buffers)), 'contents match')
			t.end()
		})

		res.on('data', function (data) {
			buffers.push(data)
		})
	})
})