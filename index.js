const staticroute = require('static-route')
let app = require('http').createServer(staticroute({autoindex:true, tryfiles:["./WebInterface/index.html"]}))
  , io = require('socket.io')(app)

io.on('connection', (sock)=>console.log(sock.id, sock.client.conn.remoteAddress))

app.listen(8080)
