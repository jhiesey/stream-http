var Buffer = require('buffer').Buffer
var fs = require('fs');
var test = require('tape')

var copies = 1000

var referenceOnce = fs.readFileSync(__dirname + '/../server/static/basic.txt');
var reference = new Buffer(referenceOnce.length * 1000)
reference.fill(referenceOnce)

var http = require('../..')

test('text streaming', function (t) {
	http.get('/basic.txt?copies=1000', function (res) {
		var buffers = []

		res.on('end', function () {
			t.ok(buffers.length > 5, 'received in multiple parts')
			t.ok(reference.equals(Buffer.concat(buffers)), 'contents match')
			t.end()
		})

		res.on('data', function (data) {
			buffers.push(data)
		})
	})
})