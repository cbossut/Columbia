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

/*
trapèze date high low et adresse PCA

GPIO dispo :
2.3.4.14.15.17.18.27.22.23.24

Mise doit être envoyée état de départ au départ ! Pas seulement à l'appui du capteur (avant launch)

Sauvegarde régulières de la mise en cas de coupure de courant

Capteurs = très prioritaire

cuisine :
chaque canal est une fonction du temps écrite soit en dur dans cuisine.js soir en configurable dans cuisine.json, à voir comment une fonction de stringify
Voir à pouvoir remplacer tout paramètre fixe par un random avec min max et période, y compris la période randomisée ?

Oter le blanc en fin des fichiers wav

8- default pullup 9+ default pulldown
gpio5 pour jumper wifi, 6ème rangée en partant de l'usb
*/

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
    , gpioOff = new Gpio(24, 'in', 'falling', {debounceTimeout: 30}) // TODO Clignote la led un peu, puis passer la led en power led ? (celle brute sur la carte)
    , gpioLed = new Gpio(15, 'out')
    , cl = require("./cueList.js")
    , or = cl.orgue
    , player = require('./player.js') // Player is only loaded to get sound info for interface
    , PCA = require('./pca.js') // Inited by cl.load
    , DMX = require('./DMX.js')
    , cuisine = null
    , cuisinePath = './cuisine.json'
    , savePath = './data/'
    , soundPath = './sounds/'
    , soundExtensionFilter = '.wav'
    , autosavePath = savePath + 'autosave.json'
    , configPath = './config.json'
    , miseFPS = 40
let soundInterval = null
  , interfaced = false
// if not interfaced, gpio button starts sequence with no information back
// else it starts like the interface play button was clicked
  , config = {
    conduite: './conduite.json',
    DMXaddrs: 24, // sends all values from chanel 1 to DMXaddrs, for lame gradators
    protoMise:
      {
        circuit: {mode: 'PCA/DMX/Orgue', addr: 65, n:15}, // addr counting from 1
        vHigh: 100, // %
        vLow: 0, // %
        tOff: 2, // s from launch
        tOn: 268, // s from launch
        dOff: 30, // s fade out time
        dOn: 30, // s fade in time
      },
    mise: [],
    startDelay: 0, // s start time from launch
    compte: [] // Nombre d'appuis gpio par lancement de l'appli
  }
  , launched = false

new Gpio(23, 'out').writeSync(1) // Running indicator for power relays

console.log("<-----start----->")
console.error("<-----start----->")

function terminate() {
  console.log('<---terminate--->')
  console.error('<---terminate--->')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  cl.save(autosavePath)
  DMX.close()
  gpioStart.unexport()
  gpioOff.unexport()
  gpioLed.writeSync(0)
  gpioLed.unexport()
  process.exit()
}

gpioOff.watch((err, value) => {
  console.log("Turning off !!!!!!!!!!!!!!")
  console.error("Turning off !!!!!!!!!!!!!!")
  require('child_process').exec('sudo halt')
})

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

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath))
}
cl.load(config.conduite) // init PCA
config.compte.unshift(0)

gpioLed.writeSync(1)

gpioStart.watch((err, value) => {
  if (err) {
    console.error(err)
    terminate()
  }

  if (!interfaced && value) { // TODO falling ? rising ? both ? cf new
    config.compte[0]++
    gpioLed.writeSync(0)
    launch()
  }/* else {
    if (cl.getSoundStat().playing) cl.cut()
    playInterfaced(0, sock)
  }*/
})

io.on('connection', sock => {

  console.log(sock.id, sock.client.conn.remoteAddress)

  //process.on('uncaughtException', e=>sock.emit('debug', {message:'except', err:JSON.stringify(e)}))

  interfaced = true

  sock.on('disconnect', ()=>{
    interfaced = false
    cl.cut()
    cl.load(config.conduite)
    gpioLed.writeSync(1)
  })

  sock.on('exit', () => {
    terminate()
  })

  let tmpPath = config.conduite.split('/')
  if (tmpPath.slice(0,-1).join('/') + '/' != savePath)
    sock.emit('fileName', config.conduite)
  else
    sock.emit('fileName', tmpPath[tmpPath.length - 1].split('.')[0])

  sock.on('conduiteChange', fileName => {
    config.conduite = savePath + fileName + '.json'
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2)) // TODO pourquoi écrire tout de suite ?
    sock.emit('config', config) // TODO juste pour actualier le nom
  })
  sock.on('configChange', ch => {
    Object.assign(config, ch)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2)) // TODO pourquoi écrire tout de suite ?
  })
  sock.on('addMise', () => {
    let newMise = JSON.parse(JSON.stringify(config.protoMise))
    config.mise.push(newMise)
    sock.emit('mise', config.mise)
  })
  sock.on('delMise', () => {
    config.mise.pop()
    sock.emit('mise', config.mise)
  })
  sock.on('miseChange', ch => {
    if (ch.new.hasOwnProperty('circuit')) {
      Object.assign(config.mise[ch.n].circuit, ch.new.circuit)
      delete ch.new.circuit
    }
    Object.assign(config.mise[ch.n], ch.new)
  })
  sock.on('testMise', sendMise)
  sock.on('stopMise', () => clearTimeout(miseTimeout))

  let DMXinter = undefined
    , DMXorgue = []
  sock.on('DMX', obj => {
    DMXorgue[obj.channel - 1] = Math.floor(obj.val * 2.55)
    if (!DMXinter) setTimeout(()=>{
      DMX.write(formatDMX(DMXorgue, config.DMXaddrs))
      DMXinter = undefined
    }, 1000/miseFPS)
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

  sock.emit('soundFiles', fs.readdirSync(soundPath).filter(v=>v.endsWith(soundExtensionFilter)))

  sock.emit('config', config)

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

  sock.on('orgue', d=>or.setLevel(d.led, parseInt(d.val, 10)))

  sock.on('patchChange', ch=>Object.assign(or.patch[ch.n], ch.new))

  soundInterval = null
  sock.on('loadSound', f => {
    cl.soundPath = soundPath + f
    loadSound(sock)
  })
  sock.on('playSound', p=>playInterfaced(p, sock))
  sock.on('pauseSound', ()=>cl.cut())

  sock.emit('cuisine', fs.existsSync(cuisinePath))
  sock.on('reloadCuisine', () => cuisine ? cuisine.load(cuisinePath) : console.error('NO CUISINE !'))
})

app.listen(8080)

function loadSound(sock) {
  let good = cl.soundPath.endsWith(soundExtensionFilter)
  player.soundPath = cl.soundPath
  setTimeout(
    ()=>{
      sock.emit('soundInfo', {file: player.soundPath, duration: player.dur, error: !good})
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

function launch() {
  if (launched) return;

  launched = true
  sendMise()
  setTimeout(() => {cl.play()}, config.startDelay/1000)
}

let miseTimeout
  , isCuisine = fs.existsSync(cuisinePath)

if (isCuisine) cuisine = require('./cuisine.js')

function sendMise(t = 0) { // en s depuis launch
  let DMXvals = []
    , dNext = isCuisine ? 1/miseFPS : Number.POSITIVE_INFINITY // en s
    , allEnded = true
  for (let i in config.mise) {
    with(config.mise[i]){
      if (circuit) {
        let v // en %
          , ended = false
        if (t < tOff) {
          v = vHigh
          dNext = Math.min(dNext, tOff - t)
        }
        else if (t - tOff < dOff) {
          v = vHigh - (vHigh - vLow) * (t - tOff) / dOff
          dNext = Math.min(dNext, 1/miseFPS)
        }
        else if (t < tOn) {
          v = vLow
          dNext = Math.min(dNext, tOn - t)
        }
        else if (t - tOn < dOn) {
          v = vLow + (vHigh - vLow) * (t - tOn) / dOn
          dNext = Math.min(dNext, 1/miseFPS)
        }
        else {
          v = vHigh
          ended = true
        }

        if (!ended) allEnded = false

        if (circuit.mode == 'PCA') {
          v = Math.floor(v * 40.96)
          PCA.setLed(circuit.addr, circuit.n - 1, v)
        } else if (circuit.mode == 'DMX') {
          v = Math.floor(v * 2.55)
          DMXvals[circuit.addr - 1] = v
        } else if (circuit.mode == 'Orgue') {
          v = Math.floor(v * 40) // TODO 40 = dépendance à l'interface factor
          or.setLevel(circuit.addr - 1, v)
        }
      }
    }
  }

  if (isCuisine) cuisine.update(t).forEach((v,i,a) => DMXvals[i] = Math.max(DMXvals[i], v))

  if (DMXvals.length) {
    DMX.write(formatDMX(DMXvals, config.DMXaddrs))
  }
  if (!allEnded) miseTimeout = setTimeout(()=>sendMise(t + dNext), dNext*1000)
  else gpioLed.writeSync(1)
}

function formatDMX(data, nAddr) {
  for (let i = 0 ; i < nAddr ; i++) {
    data[i] = data[i] || 0
  }
  return data
  }
/*
function fadeMise(t = 0) { // check closure function ou => ?
  let grad = 1/(time*miseFPS)
    , state = 0
    , inter = null
    , fade = () => {
      if (state >= 1) {
        clearInterval(inter)
        sendMise(up ? config.mise.valeurs : Array(config.mise.valeurs).fill(0))
      } else {
        sendMise(config.mise.valeurs.map(v => v*(up ? state : 1-state)))
        state += grad
      }
    }
  inter = setInterval(fade, 1000/miseFPS)
}
*/
