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

const staticroute = require('static-route')
    , app = require('http').createServer(staticroute({
        dir:"./WebInterface",
        autoindex:true,
        tryfiles:["columbox.html"],
        logger: function () {console.error(arguments)}
      }))
    , io = require('socket.io')(app)
    , expose = {}

let sock = null

function init (cbCo) {
  io.on('connection', s => {
    sock = s

    s.on('fn', (name, ...args) => {
      if ( !expose[name] ) console.error('No function exposed for ', name)
      else expose[name](...args)
    })

    if ( cbCo ) cbCo()
  })

  app.listen(8080)
}

module.exports = {

  init: init,

  emit: (mess, ...args) => {
    if ( sock ) sock.emit(mess, ...args)
    else console.error('No client, message : ' + mess)
  },

  expose: fn => expose[fn.name] = fn,

  exposeModule: mod => Object.assign(expose, mod.expose)
}
