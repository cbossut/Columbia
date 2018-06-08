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
    , player = require('./player.js')
    , savePath = './data/'
    , soundPath = './sounds/'

io.on('connection', sock => {
  console.log(sock.id, sock.client.conn.remoteAddress)
  
  sock.emit('cueList', cl.content)
  sock.emit('patch', {
    patch: cl.orgue.patch,
    pcas: cl.orgue.pcas
  })
  sock.emit('orgueState', cl.orgue.state)
  
  sock.emit('soundFiles', fs.readdirSync(soundPath))
  
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
  sock.on('addCue', (name,n) => {
    cl.addCue({name:name},n)
    sock.emit('cueList', cl.content) //TODO should not update full cueList
  })
  sock.on('cueChange', ch => Object.assign(cl.content[ch.n], ch.change))
  sock.on('delete', n => {
    cl.removeCue(n)
    sock.emit('cueList', cl.content)
  })
  sock.on('update', n => {
    cl.updateCue(n)
  })
  sock.on('apply', n => {
    cl.applyCue(n)
    sock.emit('orgueState', cl.orgue.state)
  })
  
  sock.on('go', n => cl.go(n, function (ongoing, elapsed) {
    sock.emit('orgueState', cl.orgue.state)
    sock.emit('playStatus', {play:ongoing, time:elapsed/1000})
  })) // TODO poll instead of callback because probably don't need as fast as graduation for interface
  sock.on('stop', () => cl.stop())
  
  sock.on('print', () => cl.print())
  
  sock.on('orgue', (d)=>or.setLevel(d.led, parseInt(d.val)))
  
  
  let soundInterval = null
  sock.on('loadSound', f => {
    player.soundPath = soundPath + f
    setTimeout(
      ()=>sock.emit('soundInfo', {duration: player.dur}),
      1500 // just to let player get dur ...
    )
  })
  sock.on('playSound', p=>{
    if (soundInterval) clearInterval(soundInterval)
    player.play(p)
    soundInterval = setInterval(function() {
      let state = {
        playing: player.isPlaying(),
        pos: player.getPos()
      }
      if (!state.playing) clearInterval(soundInterval)
      sock.emit('soundPlayStat', state)
    }, 40)
  })
  sock.on('pauseSound', ()=>player.pause())
})

app.listen(8080)
