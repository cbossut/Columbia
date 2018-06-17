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

const orgue = require("./orgue.js")
    , fs = require('fs')
    , spawn = require('child_process').spawn

let cl = {
  soundPath: '',
  content: [],
  orgue: orgue
}
  , cue = {
      name: 'Mise'
    , state: [0]
    , upTime: 10
    , downTime: 10
    , date: -1
    }
  , omx = null
  , soundTimeRef = -1
  , soundPosRef = 0

cl.new = function() {
  this.soundPath = ''
  this.content = []
  this.orgue.init()
}

cl.save = function(path) {
  fs.writeFileSync(path, JSON.stringify({
    cueList: this.content,
    soundPath: this.soundPath,
    patch: this.orgue.patch
  }))
}

cl.load = function(path) {
  let l = JSON.parse(fs.readFileSync(path))
  this.orgue.init(l.patch)
  this.orgue.patch = l.patch //TODO crap first set for interface then reseted by pca.init(cb)
  this.content = l.cueList
  this.soundPath = l.soundPath
  this.content.forEach((v,i,a)=>{
    Object.keys(cue).forEach(k=>{
      if (!v[k]) v[k] = cue[k]
    })
  })
}

cl.addCue = function(c=cue, n = this.content.length-1, writeState = true) {
  let oldCue = this.content[n]||{}
    , newCue = {}
  Object.keys(cue).forEach(k=>{
    newCue[k] = c[k] || cue[k]
  })
  if (writeState) newCue.state = this.orgue.state.slice()
  else newCue.state = oldCue.state.slice()
  this.content.splice(n+1, 0, newCue)
}

cl.removeCue = function(n) {
  this.content.splice(n,1)
}

cl.updateCue = function(n) {
  this.content[n].state = this.orgue.state
}

cl.applyCue = function(n) {
  this.orgue.state = this.content[n].state
}

let playTimeouts = []
cl.play = function(pos = 0, cb = null) {
  if (omx) return;
  let second = Math.floor(pos/1000)
  soundPosRef = second*1000
  playTimeouts = []
  this.applyCue(0)
  omx = spawn('omxplayer', [this.soundPath, '-Il', second.toString()])
  omx.stderr.once('data', () => {
    soundTimeRef = new Date().getTime()
    this.content.forEach((v,i,a)=>{
      if (v.date != -1 && v.date >= pos) playTimeouts[i] = setTimeout(()=>this.go(i-1, cb), v.date-1000*second)
    })
  })
  omx.on('close', cleanOmx)
}

cl.cut = function() {
  if (!omx) return;
  this.stop()
  omx.stdin.write('q')
  soundPosRef = new Date().getTime() - soundTimeRef + soundPosRef
  soundTimeRef = -1
}

cl.getSoundStat = function() {
  if (omx) return {playing: true, pos: new Date().getTime() - soundTimeRef + soundPosRef}
  return {playing: false, pos: soundPosRef}
}

cl.go = function(n = 0, cb = null) {
  if (n < 0 || n >= this.content.length - 1) {
    if (cb) cb(false, null)
    return;
  }
  this.stop()
  this.from = this.content[n].state
  this.to = this.content[++n].state
  this.downLeds = []
  this.upLeds = []
  let downDiff = -1
    , upDiff = -1
  for(let i = 0 ; i < Math.max(this.to.length, this.from.length) ; i++) {
    let diff = (this.to[i]||0) - (this.from[i]||0)
    if (diff < 0) {
      this.downLeds.push(i)
      downDiff = Math.max(downDiff, -diff)
    } else if (diff > 0) {
      this.upLeds.push(i)
      upDiff = Math.max(upDiff, diff)
    }
  }
  let downMs = downDiff == -1 ? 0 : this.content[n].downTime * 1000
    , upMs = upDiff == -1 ? 0 : this.content[n].upTime * 1000
  
  this.interMs = Math.max(
    this.orgue.minMsInter,
    Math.min(downMs/downDiff, upMs/upDiff)
    )
  this.downFrames = Math.round(downMs/this.interMs)
  this.upFrames = Math.round(upMs/this.interMs)
  this.frameCount = 0
  
  let start = this.from.slice()
  if (!this.downFrames) this.downLeds.forEach(v => start[v] = this.to[v])
  if (!this.upFrames) this.upLeds.forEach(v => start[v] = this.to[v])
  
  this.orgue.state = start
  this.nextFrame = new Date().getTime()
  this.timeOut = setTimeout(()=>{this.inter(cb)}, this.interMs)
}

cl.inter = function(cb) {
  this.frameCount++
  this.nextFrame += this.interMs

  let diff = new Date().getTime() - this.nextFrame
  if (diff >= this.interMs) {
    let jumped = Math.floor(diff/this.interMs)
    diff -= jumped * this.interMs
    this.nextFrame += jumped * this.interMs
    this.frameCount += jumped
  }
  
  let loop = false
    , ratioUp = this.frameCount/this.upFrames
    , ratioDown = this.frameCount/this.downFrames
    , res = this.from.slice()
  if (ratioUp < 1) {
    loop = true
    this.upLeds.forEach(
      v => res[v] = Math.round(this.from[v] + ratioUp * (this.to[v]-this.from[v]))
    )
  } else {
    this.upLeds.forEach(v => res[v] = this.to[v])
  }
  if (ratioDown < 1) {
    loop = true
    this.downLeds.forEach(
      v => res[v] = Math.round(this.from[v] + ratioDown * (this.to[v]-this.from[v]))
    )
  } else {
    this.downLeds.forEach(v => res[v] = this.to[v])
  }
  this.orgue.state = res
  
  if (loop) this.timeOut = setTimeout(()=>{this.inter(cb)}, this.interMs - diff)
  if (cb) cb(loop, this.frameCount*this.interMs)
}

cl.stop = function() {
  clearTimeout(this.timeOut)
}

cl.print = function() {
  for(let i = 0 ; i < this.content.length ; i++) {
    let c = this.content[i]
    console.log(c.name, "up", c.upTime, "down", c.downTime, "date", c.date, c.comment, c.state)
  }
  this.orgue.patch.forEach((v,i)=>console.log(i, 'addr', v.pca, v.leds, 'exp', v.exp))
}


function cleanOmx() {
  omx = null
  playTimeouts.forEach(v=>clearTimeout(v))
  playTimeouts = []
}


module.exports = cl
