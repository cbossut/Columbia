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
TODO pouvoir marquer une fin dans un scenario de cuisine

Retour mise date on par rapport à fin séquence (delayStart + soundLength)
Mais c'est reposer sur soundStat qui n'est pas précis, et des fois on veux pas
Du coup, plutôt offrir l'option de calculer auto

TODO random valeur const et durée pour diapo dans cuisine cuisine

TODO bug quand on lance testMise, il faudrait cutter tout comme au stop pour ne pas perdre des interval/timeout

BUG check err.txt de pano, exception omx à catcher silently

loadsound 124 kill -9 fail, no process
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
    , gpioTemoin = new Gpio(23, 'out') // Running indicator for power relays
    , gpioOff = new Gpio(24, 'in', 'falling', {debounceTimeout: 1000}) // TODO Clignote la led un peu, puis passer la led en power led ? (celle brute sur la carte)
    , gpioLed = new Gpio(15, 'out')
    , cl = require("./cueList.js")
    , or = cl.orgue
    , player = require('./player.js') // Player is only loaded to get sound info for interface
    , PCA = require('./pca.js') // Inited by cl.load
    , DMX = require('./DMX.js')
    , savePath = './data/'
    , soundPath = './sounds/'
    , soundExtensionFilter = '.wav'
    , autosavePath = savePath + 'autosave.json'
    , configPath = './config.json'
    , cuisinePath = './cuisine.json'
    , signPath = './cuisineSign.json'
    , miseFPS = 40
    , isCuisine = fs.existsSync(cuisinePath)
let soundInterval = null
  , interfaced = false
  , sockGPIO = null // TODO could serve as interfaced and sock for all file
  , config = {
    conduite: './conduite.json',
    starters: [], // GPIO numbers for start
    debounceTimeout: 1000,
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
    compte: [], // Nombre d'appuis gpio par lancement de l'appli
    relaunchTime: 0
  }
  , launched = false
  , cuisine = null
  , gpioStarters = []
  , miseTimeout = null
  , conduiteTimeout = null
  , signCuisineInter = null
  , tSignCuisine = 0
  , startMise = []
  , relaunchTimeout = null
  , relaunch = true
  , testGPIO = false
  , starterStates = []

if (isCuisine) cuisine = require('./cuisine.js') // TODO Check exists because autoload in cuisine module

console.log("<-----start----->")
console.error("<-----start----->")

function terminate() {
  console.log('<---terminate--->')
  console.error('<---terminate--->')
  cl.cut()
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  cl.save(autosavePath)
  DMX.close()
  gpioStarters.forEach(v=>v.unexport())
  gpioOff.unexport()
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

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath)) // TODO shound probably inherit from config
}
cl.load(config.conduite) // init PCA
config.compte.unshift(0)

if (config.starters.length) { // s'il y a des capteurs, maquette, startState, temoin, watch off
  watchStarters(config.debounceTimeout || 1000)

  setTimeout(startState, 1000)

  gpioTemoin.writeSync(1)
  setTimeout(()=>{
    gpioOff.watch((err, value) => {
      if (interfaced && sockGPIO) {
        sockGPIO.emit('gpio', {type:'off', val:value})
      } else {
        console.log("Turning off !!!!!!!!!!!!!!")
        console.error("Turning off !!!!!!!!!!!!!!")
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
        gpioTemoin.writeSync(0)
        require('child_process').exec('sudo halt')
      }
    })
  }, 5*60*1000) // tempo 5min avant watch au cas où ça jumpe dans le début
} else { // s'il n'y a pas de capteurs, cuisine, mise, ni temoin ni watch (au kazoo)
  // TODO cuisine s'éteint-elle toute seule si on remet watch et temoin ?
  setTimeout(sendMise, 1000)

  gpioTemoin.writeSync(0)
}

gpioLed.writeSync(1)

io.on('connection', sock => {

  sockGPIO = sock

  console.log(sock.id, sock.client.conn.remoteAddress)

  //process.on('uncaughtException', e=>sock.emit('debug', {message:'except', err:JSON.stringify(e)}))

  interfaced = true

  sock.on('disconnect', ()=>{
    interfaced = false
    cl.cut()
    cl.load(config.conduite)
    gpioLed.writeSync(1)
    sockGPIO = null
    testGPIO = false
  })

  sock.on('exit', () => {
    terminate()
  })

  sock.emit('gpio', {type:'temoin', val:gpioTemoin.readSync()})
  sock.emit('gpio', {type:'off', val:gpioOff.readSync()})
  sock.emit('gpio', {type:'led', val:gpioLed.readSync()})
  gpioStarters.forEach((v,i) => sock.emit('gpio', {type:'starter'+i, val:v.readSync()}))
  sock.on('launch', launch)
  sock.on('debounceStarters', dT => {
    config.debounceTimeout = dT
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2)) // TODO save button ?
    watchStarters(dT)
  })
  sock.emit('debounceTimeout', config.debounceTimeout || 1000)
  sock.on('relaunchTimeout', dT => {
    config.relaunchTime = dT
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2)) // TODO save button ?
  })
  sock.emit('relaunchTimeout', config.relaunchTime || 0)
  testGPIO = false
  sock.on('testGPIO', v => {testGPIO = v})

  let tmpPath = config.conduite.split('/')
  if (tmpPath.slice(0,-1).join('/') + '/' != savePath)
    sock.emit('fileName', config.conduite)
  else
    sock.emit('fileName', tmpPath[tmpPath.length - 1].split('.')[0])

  sock.on('conduiteChange', fileName => {
    config.conduite = savePath + fileName + '.json'
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2)) // TODO save button ?
    sock.emit('config', config) // TODO juste pour actualier le nom
  })
  sock.on('configChange', ch => {
    Object.assign(config, ch)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
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
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  })
  sock.on('testMise', sendMise)
  sock.on('stopMise', () => {
    clearTimeout(miseTimeout)
    clearTimeout(conduiteTimeout)
    clearInterval(signCuisineInter)
    cl.cut()
  })

  let DMXinter = undefined
    , DMXorgue = []
  sock.on('DMX', obj => {
    DMXorgue[obj.channel - 1] = Math.floor(obj.val * 2.55)
    if (!DMXinter) setTimeout(()=>{
      DMX.write(DMXorgue)
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
  sock.on('reloadCuisine', () => {
    cuisine ? cuisine.load(cuisinePath) : console.error('NO CUISINE !')
    clearTimeout(miseTimeout)
    clearTimeout(conduiteTimeout)
    clearInterval(signCuisineInter)
    cl.cut()
    startState()
  })
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
  sock.emit('gpio', {type:'led', val:0})

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
      sock.emit('gpio', {type:'led', val:1})
    }
  }, 40)
}

function launch() {
  if (launched) return;

  launched = true
  gpioLed.writeSync(0)
  if (interfaced && sockGPIO) sockGPIO.emit('gpio', {type:'led', val:0})
  clearInterval(signCuisineInter)

  cuisine.load(cuisinePath)
  sendMise()
  conduiteTimeout = setTimeout(() => {cl.play()}, config.startDelay*1000)
}

function startState() {
  launched = false
  cl.cut()
  gpioLed.writeSync(1)
  if (interfaced && sockGPIO) sockGPIO.emit('gpio', {type:'led', val:1})
  clearTimeout(miseTimeout)
  clearTimeout(conduiteTimeout)

  cl.applyCue(0)
  startMise = sendMise(0, false)
  if (fs.existsSync(signPath)) {
    cuisine.load(signPath)
    tSignCuisine = 0
    signCuisineInter = setInterval(()=>{
      DMX.write(mixDMX(cuisine.update(tSignCuisine), startMise))
      tSignCuisine += 1/miseFPS
    }, 1000/miseFPS)
  }
}

// TODO cuisine pourrait être un mode, comme DMX, l'addresse étant l'index dans params, et la valeur un subMaster du scenario
function sendMise(t = 0, run = true) { // en s depuis launch
  let DMXvals = []
    , dNext = isCuisine ? 1/miseFPS : Number.POSITIVE_INFINITY // en s
    , allEnded = true
  for (let line of config.mise) {
    with(line){
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

        if (circuit.mode == 'NONE') {/*
          v = Math.floor(v * 40.96)
          PCA.setLed(circuit.addr, circuit.n - 1, v)*/
        } else if (circuit.mode == 'DMX') {
          v = Math.round(v * 2.55)
          DMXvals[circuit.addr - 1] = v
        } else if (circuit.mode == 'Orgue') {
          v = Math.floor(v * 40) // TODO 40 = dépendance à l'interface factor
          or.setLevel(circuit.addr - 1, v)
        }
      }
    }
  }

  if (isCuisine && run) {
    DMXvals = mixDMX(cuisine.update(t), DMXvals)
  }

  DMX.write(DMXvals)

  if (run) {
    if (!allEnded) miseTimeout = setTimeout(()=>sendMise(t + dNext), dNext*1000)
    else startState()
  }

  return DMXvals
}

function mixDMX(v1, v2) {
  let res = []
  for (let i = 0 ; i < v1.length || i < v2.length ; i++) {
    if (!v1[i]) res[i] = v2[i]
    else if (!v2[i]) res[i] = v1[i]
    else res[i] = Math.max(v1[i], v2[i])
  }
  return res
}

function watchStarters(dT) {
  gpioStarters.forEach(v => v.unexport())
  gpioStarters = []

  config.starters.forEach((v,i) => {
    let g = new Gpio(v, 'in', 'both', {debounceTimeout: dT})
    starterStates[i] = g.readSync()
    g.watch((err, value) => {
      if (err) {
        console.error(err)
        terminate()
      }

      starterStates[i] = value
      if (interfaced && sockGPIO) {
        sockGPIO.emit('gpio', {type:'starter'+i, val:value})
      }

      if (!relaunch && !value && relaunchTimeout) {
        clearTimeout(relaunchTimeout)
        relaunchTimeout = null
      }

      if (!launched && !value && relaunch && !testGPIO) {
        config.compte[0]++ // TODO y a-t-il une ou deux personnes ?
        launch()
        relaunch = false
      }

      else if (starterStates.every(v => v) && config.relaunchTime && !testGPIO) {
        relaunchTimeout = setTimeout(() => {relaunch = true;relaunchTimeout = null; }, config.relaunchTime)
      }
    })
    gpioStarters.push(g)
  })
}