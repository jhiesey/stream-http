var test = require('tape')
// var crypto = require('crypto')
var hashes = require('./hashes.json')
var Buffer = require('buffer').Buffer
// var sha1 = require('simple-sha1')

var fs = require('fs');
var reference = fs.readFileSync(__dirname + '/../server/static/basic.txt');

var http = require('../..')

test('basic functionality', function (t) {
	// var hash = crypto.createHash('sha256')
	// hash.setEncoding('hex')

	http.get('/basic.txt', function (res) {
		// var hash = crypto.createHash('sha256')
		// hash.setEncoding('hex')

		var buffers = []

		res.on('end', function () {
			// console.warn('end')
			// hash.end()
			t.ok(reference.equals(Buffer.concat(buffers)), 'contents match')
			t.end()
		})

		res.on('data', function (data) {
			// console.warn('data')
			// console.log(data.toString('utf-8'))
			buffers.push(data)
		})

		// res.pipe(hash)
	})
})