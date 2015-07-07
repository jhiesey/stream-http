// These tests are teken from http-browserify to ensure compatibility with
// that module
var test = require('tape')

global.window = {}
window.location = {
		hostname: 'localhost',
		port: 8081,
		protocol: 'http:'
}

var noop = function() {}
window.XMLHttpRequest = function() {
	this.open = noop
	this.send = noop
	this.withCredentials = false
}

var moduleName = require.resolve('../../')
delete require.cache[moduleName]
var http = require('../../')

test('Test simple url string', function(t) {
	var url = { path: '/api/foo' }
	var request = http.get(url, noop)

	t.equal( request._url, 'http://localhost:8081/api/foo', 'Url should be correct')
	t.end()

})

test('Test full url object', function(t) {
	var url = {
		host: "localhost:8081",
		hostname: "localhost",
		href: "http://localhost:8081/api/foo?bar=baz",
		method: "GET",
		path: "/api/foo?bar=baz",
		pathname: "/api/foo",
		port: "8081",
		protocol: "http:",
		query: "bar=baz",
		search: "?bar=baz",
		slashes: true
	}

	var request = http.get(url, noop)

	t.equal( request._url, 'http://localhost:8081/api/foo?bar=baz', 'Url should be correct')
	t.end()

})

test('Test alt protocol', function(t) {
	var params = {
		protocol: "foo:",
		hostname: "localhost",
		port: "3000",
		path: "/bar"
	}

	var request = http.get(params, noop)

	t.equal( request._url, 'foo://localhost:3000/bar', 'Url should be correct')
	t.end()

})

test('Test string as parameters', function(t) {
	var url = '/api/foo'
	var request = http.get(url, noop)

	t.equal( request._url, 'http://localhost:8081/api/foo', 'Url should be correct')
	t.end()

})

test('Test withCredentials param', function(t) {
	var url = '/api/foo'

	var request = http.get({ url: url, withCredentials: false }, noop)
	t.equal( request._xhr.withCredentials, false, 'xhr.withCredentials should be false')

	var request = http.get({ url: url, withCredentials: true }, noop)
	t.equal( request._xhr.withCredentials, true, 'xhr.withCredentials should be true')

	var request = http.get({ url: url }, noop)
	t.equal( request._xhr.withCredentials, true, 'xhr.withCredentials should be true')

	t.end()
})

test('Cleanup', function (t) {
	delete global.window
	delete require.cache[moduleName]
	t.end()
})
