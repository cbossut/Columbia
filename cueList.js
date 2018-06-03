const orgue = require("./orgue.js")
    , fs = require('fs')

let cl = {}
  , cue = {
      name: 'Mise'
    , state: [0]
    , upTime: 10
    , downTime: 10
    , date: -1
    }

cl.content = []

cl.orgue = orgue
orgue.init()

cl.save = function(path) {
  fs.writeFileSync(path, JSON.stringify(this.content))
}

cl.load = function(path) {
  let parsed = JSON.parse(fs.readFileSync(path))
  this.content = parsed.map((v,i,a)=>Object.assign(Object.create(cue), v))
}

cl.addCue = function(c=cue, n = this.content.length-1, writeState = true) {
  let oldCue = this.content[n]||{}
    , newCue = {}
  if (writeState) c.state = this.orgue.state
  Object.keys(cue).forEach(k=>{
    newCue[k] = c[k] || oldCue[k] || cue[k]
  })
  newCue.state = newCue.state.slice() //Security, just to be sure...
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

cl.go = function(n = 0, cb = null) {
  if (n < 0 || n >= this.content.length - 1) return;
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
    console.log(c.name, "up", c.upTime, "down", c.downTime, c.state)
  }
}

module.exports = {
  proto: cl
}
