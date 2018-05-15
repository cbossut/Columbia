const staticroute = require('static-route')
let app = require('http').createServer(staticroute({dir:"./WebInterface", autoindex:true, tryfiles:["index.html"]}))
  , io = require('socket.io')(app)
  , cl = Object.create(require("./cueList.js").proto)
  , or = cl.orgue

io.on('connection', (sock)=> {
  console.log(sock.id, sock.client.conn.remoteAddress)
  
  or.init()
  
  sock.on('orgue', (d)=>or.setLevel(d.led, parseInt(d.val)))
})

app.listen(8080)
