/*
Copyright ou © ou Copr. Clément Bossut, (2018)
<bossut.clement@gmail.com>

Ce logiciel est un programme informatique servant à écrire et jouer une conduite lumière synchronisée avec du son sur une Raspberry Pi avec PCA8596. 

Ce logiciel est régi par la licence CeCILL soumise au droit français et
respectant les principes de diffusion des logiciels libres. Vous pouvez
utiliser, modifier et/ou redistribuer ce programme sous les conditions
de la licence CeCILL telle que diffusée par le CEA, le CNRS et l'INRIA 
sur le site "http://www.cecill.info".
*/

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
  })
  sock.on('load', fileName => {
    cl.load(savePath + fileName + '.json')
    loadSound(sock)
    sock.emit('cueList', cl.content)
    sock.emit('patch', {
      patch: cl.orgue.patch,
      pcas: cl.orgue.pcas
    })
    sock.emit('orgueState', cl.orgue.state)
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
  
  sock.on('orgue', d=>or.setLevel(d.led, parseInt(d.val)))
  
  sock.on('patchChange', ch=>Object.assign(or.patch[ch.n], ch.new))
  
  let soundInterval = null
  sock.on('loadSound', f => {
    cl.soundPath = soundPath + f
    loadSound(sock)
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

function loadSound(sock) {
  player.soundPath = cl.soundPath
  setTimeout(
    ()=>sock.emit('soundInfo', {file: player.soundPath, duration: player.dur}),
    1500 // just to let player get dur ...
  )
}
