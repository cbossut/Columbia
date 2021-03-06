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

const fs = require('fs')
    , omx = require('omxplayer-controll')
    , opts = {
      'audioOutput': 'local',
      'disableKeys': true,
      'disableOnScreenDisplay': true
    }

if (!omx.stop) omx.stop = function() {this.setPosition(360000)}

// All time in ms but omx.get/setPos in cs and status.pos in us and startAt in s

player = {
  path: '',
  get soundPath() {return this.path},
  set soundPath(p) {
    this.stop()
    this.path = ''
    this.dur = -1
    omx.once('changeStatus', function(s) {
      player.path = p
      player.dur = s.duration/1000
      player.stop()
    })
    omx.open(p, {startVolume: 0})
  },
  run: false,
  pos: -1,
  paused: false,
  refPos: 0,
  refTime: 0,
  dur: 0
}

player.isPlaying = function() {return (!this.paused) && this.run}

player.play = function(p = -1) {
  if (!this.path) return;
  p = Math.round(p)
  if (this.run) {
    if (p >= 0) {
      omx.setPosition(p/10, function(err) {
        player.refPos = p //temporary
        player.refTime = new Date().getTime()
        player.ref()
      })
    }
    if (this.paused) {
      this.paused = false
      this.refPos = this.pos //temporary
      this.refTime = new Date().getTime()
      this.ref()
      omx.playPause()
    }
  } else {
    this.run = true
    this.paused = false
    this.ref()
    omx.open(this.path,
             p == -1 ? opts : Object.assign(Object.create(opts),
                                            {startAt: p/1000}))
  }
}

player.pause = function() {
  if (!this.isPlaying()) return;
  clearTimeout(player.finish)
  omx.playPause()
  this.paused = true
  omx.getPosition(function(err, pos) {
    player.pos = pos*10 //temporary
    player.refPos = player.refTime = 0
    omx.once('changeStatus', s=>{
      if (s.status == 'Paused') player.pos = s.pos/1000
    })
  })
}

player.stop = function() {
  this.run = false
  this.pos = -1
  this.refTime = this.refPos = 0
  clearTimeout(player.finish)
  omx.stop()
}

player.getPos = function() {
  if (!this.refTime) return this.pos
  return new Date().getTime() - this.refTime + this.refPos
}

player.ref = function() {
  omx.once('changeStatus', s=>{
    player.refPos = s.pos/1000
    player.refTime = new Date().getTime()
    player.dur = s.duration/1000
    clearTimeout(player.finish)
    player.finish = setTimeout(()=>{
      player.stop()
    }, player.dur-player.refPos+500)
  })
}

omx.on('finish', ()=>player.stop())

module.exports = player
