var express = require('express')
var http = require('http')
var path = require('path')

var app = express()
var server = http.createServer(app)

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')

  next()
})

app.use(express.static(path.join(__dirname, 'static')))

var port = parseInt(process.env.ZUUL_PORT) || 8199
console.log('server listening on port', port)
server.listen(port)
