# httpstream

This module is an implementation of node's native `http` module for the browser.
It tries to match node's API and behavior as closely as possible, but some features
aren't available, since browsers don't give nearly as much control over requests for security
reasons.

This is heavily inspired by, and intended to replace, [http-browserify](https://github.com/substack/http-browserify)

## What does it do?

In accordance with its name, `httpstream` tries to provide data to its caller before
the request has completed whenever possible.

The following browsers support true streaming, where only a small amount of the request
has to be held in memory at once:
* Chrome >=??? (using the `fetch` api)
* Firefox >=??? (using `moz-chunked-arraybuffer`)

The following browsers support pseudo-streaming, where the data is available before the
request finishes, but the entire response must be held in memory:
* Chrome >=(old)
* Safari >=(old)
* IE >= 10

Additionally, older browsers other than IE support pseudo-streaming using multipart
responses, but only for text (FILL IN HERE)

## Example

``` js
http.get('/bundle.js', function (res) {
	var div = document.getElementById('result');
	div.innerHTML += 'GET /beep<br>';
	
	res.on('data', function (buf) {
		div.innerHTML += buf;
	});
	
	res.on('end', function () {
		div.innerHTML += '<br>__END__';
	});
})
```

License: MIT