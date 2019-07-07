/*
Copyright ou © ou Copr. Clément Bossut, (2018)
<bossut.clement@gmail.com>

Ce logiciel est un programme informatique servant à écrire et jouer une conduite de paramètres synchronisée sur du son.

Ce logiciel est régi par la licence CeCILL soumise au droit français et
respectant les principes de diffusion des logiciels libres. Vous pouvez
utiliser, modifier et/ou redistribuer ce programme sous les conditions
de la licence CeCILL telle que diffusée par le CEA, le CNRS et l'INRIA
sur le site "http://www.cecill.info".
*/

process.chdir(__dirname) // Run in the module folder if started from elsewhere

const fs = require('fs')
    , savePath = './data/columbox.json' // TODO should be done by save module
    , staticroute = require('static-route')
    , app = require('http').createServer(staticroute({
        dir:"./WebInterface",
        autoindex:true,
        tryfiles:["columbox.html"],
        logger: function () {console.error(arguments)}
      }))
    , io = require('socket.io')(app) // TODO should be done by interface module
    , expose = {}
    , CB = require('./columboxReader.js')
    , interMS = 1000/44 // DMX
    , DMX = require('./DMX.js') // TODO should use orgue, or separate patch module

let cbLines = []
  , nextTime = -1
  , initialTime = -1
  , playTimeout = null
  , sock = null

if ( fs.existsSync(savePath) ) cbLines = JSON.parse(fs.readFileSync(savePath))
CB.setModel(cbLines)
DMX.set16bits()

expose.play = model => {
  CB.setModel(model)
  play()
}
expose.stop = stop
expose.test = arg => console.log('yay', arg)
expose.quit = () => require('child_process').exec('sudo halt')
io.on('connection', s => {
  sock = s

  sock.emit('model', CB.getModel())

  sock.on('fn', (name, ...args) => {
    if ( !expose[name] ) console.error('No function exposed for ', name)
    else expose[name](...args)
  })
})
app.listen(8080)

function play(t = 0) {
  nextTime = t
  initialTime = new Date().getTime()
  goCB()
}

function stop() {
  if ( sock ) sock.emit('stopped')

  clearTimeout(playTimeout)
}

function goCB() {
  if ( sock ) sock.emit('playTime', nextTime)

  DMX.write(CB.read(nextTime / 1000).map(v => Math.round(v * 655.35)))
  let derive = new Date().getTime() - initialTime - nextTime
  nextTime += interMS
  playTimeout = setTimeout(goCB, interMS - derive)
}

////////////////////////////// SAVE MODULE

expose.save = model => fs.writeFileSync(savePath, JSON.stringify(model, null, 2))
