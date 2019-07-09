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

const saveModule = require('./save.js')
    , webModule = require('./webGUI.js')
    , CB = require('./columboxReader.js')
    , interMS = 1000/44 // DMX
    , DMX = require('./DMX.js') // TODO should use orgue, or separate patch module

let cbLines = saveModule.load(saveModule.savePath) || [] // columbox Model
  , nextTime = -1
  , initialTime = -1
  , playTimeout = null
  , sock = null

// prepare DMX
DMX.set16bits()

// functions exposed to the client
webModule.expose(play)
webModule.expose(stop)
webModule.expose(quit)
webModule.exposeModule(saveModule)

// launch client listening and init messages
webModule.init(() => {
  webModule.emit('model', cbLines)
})


// start reading at t in ms
function play(model = cbLines, t = 0) {
  CB.setModel(model)
  nextTime = t
  initialTime = new Date().getTime()
  goCB()
}

function stop() {
  webModule.emit('stopped')

  clearTimeout(playTimeout)
}

function goCB() {
  webModule.emit('playTime', nextTime)

  DMX.write(CB.read(nextTime / 1000).map(v => Math.round(v * 655.35)))
  let derive = new Date().getTime() - initialTime - nextTime
  nextTime += interMS
  playTimeout = setTimeout(goCB, interMS - derive)
}

function quit() {
  require('child_process').exec('sudo halt')
}
