var Buffer = require('buffer').Buffer
var fs = require('fs');
var test = require('tape')

var reference = fs.readFileSync(__dirname + '/../server/static/basic.txt');

var http = require('../..')

test('basic functionality', function (t) {
	http.get('/basic.txt', function (res) {
		var buffers = []

		res.on('end', function () {
			t.ok(reference.equals(Buffer.concat(buffers)), 'contents match')
			t.end()
		})

		res.on('data', function (data) {
			buffers.push(data)
		})
	})
})