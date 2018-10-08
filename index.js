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

process.chdir(__dirname) // Run in the module folder if started from elsewhere

const staticroute = require('static-route')
    , fs = require('fs')
    , app = require('http').createServer(staticroute({
        dir:"./WebInterface",
        autoindex:true,
        tryfiles:["index.html"]
      }))
    , io = require('socket.io')(app)
    , Gpio = require('onoff').Gpio
    , gpioStart = new Gpio(14, 'in', 'falling', {debounceTimeout: 30})
    , gpioDebug = new Gpio(4, 'in', 'both', {debounceTimeout: 100})
    , gpioLed = new Gpio(15, 'out')
    , cl = require("./cueList.js")
    , or = cl.orgue
    , player = require('./player.js') // Player is only loaded to get sound info for interface
    , savePath = './data/'
    , soundPath = './sounds/'
    , autosavePath = savePath + 'autosave.json'
    , conduitePath = './conduite.json'
let soundInterval = null
  , interfaced = false

console.log("<-----start----->")
console.error("<-----start----->")

function terminate() {
  cl.save(autosavePath)
  gpioStart.unexport()
  gpioDebug.unexport()
  gpioLed.writeSync(0)
  gpioLed.unexport()
  process.exit()
}

process.on('SIGINT', () => {
  terminate()
})
process.on('SIGUSR1', () => {
  terminate()
})
process.on('SIGUSR2', () => {
  terminate()
})

//process.on('uncaughtException', () => cl.save(autosavePath))

if (fs.existsSync(conduitePath)) {
  cl.load(conduitePath)
} else if (fs.existsSync(autosavePath)) {
  cl.load(autosavePath)
}

gpioLed.writeSync(1)

gpioStart.watch((err, value) => {
  if (err) {
    console.error(err)
    terminate()
  }
  
  if (!interfaced) {
    gpioLed.writeSync(0)
    cl.play(0, function (ongoing, elapsed) {
      if (!ongoing) gpioLed.writeSync(1)
    })
  }
})

io.on('connection', sock => {
  
  console.log(sock.id, sock.client.conn.remoteAddress)
  
  //process.on('uncaughtException', e=>sock.emit('debug', {message:'except', err:JSON.stringify(e)}))
  
  interfaced = true
  
  sock.on('disconnect', ()=>{
    interfaced = false
    cl.cut()
    gpioLed.writeSync(1)
  })
  
  gpioStart.watch((err, value) => {
    if (cl.getSoundStat().playing) cl.cut()
    playInterfaced(0, sock)
  })
  
  sock.on('exit', () => {
    terminate()
  })
  
  sock.on('new', ()=>{
    cl.new()
    sock.emit('cueList', cl.content)
    sock.emit('patch', {
      patch: cl.orgue.patch,
      pcas: cl.orgue.pcas
    })
    sock.emit('orgueState', cl.orgue.state)
  })
  
  loadSound(sock)
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
  sock.on('save', fileName => {
    cl.save(savePath + fileName + '.json')
    sock.emit('endSave')
  })
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
  
  sock.on('go', n => {
    cl.go(n, function (ongoing, elapsed) {
      sock.emit('orgueState', cl.orgue.state)
      sock.emit('playStatus', {play:ongoing, time:elapsed/1000})
    }) // TODO poll instead of callback because probably don't need as fast as graduation for interface
  })
  sock.on('stop', () => cl.stop())
  
  sock.on('print', () => cl.print())
  
  sock.on('orgue', d=>or.setLevel(d.led, parseInt(d.val)))
  
  sock.on('patchChange', ch=>Object.assign(or.patch[ch.n], ch.new))
  
  soundInterval = null
  sock.on('loadSound', f => {
    cl.soundPath = soundPath + f
    loadSound(sock)
  })
  sock.on('playSound', p=>playInterfaced(p, sock))
  sock.on('pauseSound', ()=>cl.cut())
})

app.listen(8080)

function loadSound(sock) {
  player.soundPath = cl.soundPath
  setTimeout(
    ()=>{
      sock.emit('soundInfo', {file: player.soundPath, duration: player.dur})
      sock.emit('soundPlayStat', {playing:false, pos:0})
    }, 1500 // just to let player get dur ...
  )
}

function playInterfaced(pos, sock) {
  gpioLed.writeSync(0)
  
  if (soundInterval) clearInterval(soundInterval)
  cl.play(pos, function (ongoing, elapsed) {
    sock.emit('orgueState', cl.orgue.state)
  })
  soundInterval = setInterval(function() {
    let state = cl.getSoundStat()
    sock.emit('soundPlayStat', state)
    if (!state.playing) {
      clearInterval(soundInterval)
      gpioLed.writeSync(1)
    }
  }, 40)
}
