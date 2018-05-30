const staticroute = require('static-route')
    , fs = require('fs')
    , app = require('http').createServer(staticroute({
        dir:"./WebInterface",
        autoindex:true,
        tryfiles:["index.html"]
      }))
    , io = require('socket.io')(app)
    , cl = Object.create(require("./cueList.js").proto)
    , or = cl.orgue
    , savePath = './data/'

io.on('connection', sock => {
  console.log(sock.id, sock.client.conn.remoteAddress)
  
  or.init()
  
  sock.emit('cueList', cl.content)
  sock.emit('patch', cl.orgue.patch)
  sock.emit('orgueState', cl.orgue.state)
  
  sock.on('refresh', () => {
    let jsons = fs.readdirSync(savePath).filter(v=>v.endsWith('.json'))
    sock.emit('files', jsons.map(v => v.split('.')[0]))
/*
    {
      let t=v.split('/')
      return t[t.length-1].split('.')[0]
    }))*/
  })
  sock.on('load', fileName => {
    cl.load(savePath + fileName + '.json')
    sock.emit('cueList', cl.content)
  })
  sock.on('save', fileName => cl.save(savePath + fileName + '.json'))
  sock.on('add', n => {
    cl.addCue(n)
    sock.emit('cueList', cl.content)
  })
  sock.on('cueChange', ch => Object.assign(cl.content[ch.n], ch.change))
  sock.on('delete', n => {
    cl.removeCue(n)
    sock.emit('cueList', cl.content)
  })
  sock.on('update', n => {
    cl.updateCue(n)
    sock.emit('cueList', cl.content)
  })
  sock.on('apply', n => {
    cl.applyCue(n)
    sock.emit('orgueState', cl.orgue.state)
  })
  
  sock.on('go', n => cl.go(n, (ongoing, elapsed)=>{
    sock.emit('orgueState', cl.orgue.state)
    sock.emit('playStatus', {play:ongoing, time:elapsed/1000})
  }))
  sock.on('stop', () => cl.stop())
  
  sock.on('print', () => cl.print())
  
  sock.on('orgue', (d)=>or.setLevel(d.led, parseInt(d.val)))
})

app.listen(8080)
