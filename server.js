module.exports = serve

var http = require('http')
var ecstatic = require('ecstatic')

var server = null
var statics = ecstatic(__dirname + '/share', {
  cache: 'no-cache'
})

process.env.PORT = 8080

function serve (cb) {
  server && server.close()

  server = http.createServer(function (req, res) {
    statics(req, res, function () {
      req.url = '/'
      res.statusCode = 200
      statics(req, res)
    })
  })

  server.listen(process.env.PORT, '::', function (err) {
    if (err) err.message = 'error starting server: ' + err.message
    cb && cb(err)
  })

  return server
}
