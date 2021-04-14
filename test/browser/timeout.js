var Buffer = require('buffer').Buffer
var fs = require('fs')
var test = require('tape')

var http = require('../..')

test('requestTimeout', function (t) {
	var req = http.get({
		path: '/browserify.png?copies=5',
		requestTimeout: 10 // ms
	}, function (res) {
		res.on('data', function (data) {
		})
		res.on('end', function () {
			t.fail('request completed (should have timed out)')
		})
	})
	req.on('requestTimeout', function () {
		t.pass('got requestTimeout')
		t.end()
	})
})

// TODO: reenable this if there's a way to make it simultaneously
// fast and reliable
test.skip('no requestTimeout after success', function (t) {
	var req = http.get({
		path: '/basic.txt',
		requestTimeout: 50000 // ms
	}, function (res) {
		res.on('data', function (data) {
		})
		res.on('end', function () {
			t.pass('success')
			global.setTimeout(function () {
				t.end()
			}, 50000)
		})
	})
	req.on('requestTimeout', function () {
		t.fail('unexpected requestTimeout')
	})
})

test('setTimeout', function (t) {
	t.plan(2)

	var req = http.get({
		path: '/browserify.png?copies=5'
	}, function (res) {
		res.on('data', function (data) {
		})
		res.on('end', function () {
			t.fail('request completed (should have timed out)')
		})
	})
	req.setTimeout(10, function () {
		t.pass('got setTimeout callback')
	})
	req.on('timeout', function () {
		t.pass('got timeout')
	})
})