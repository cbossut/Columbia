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

cl.content = [Object.assign(Object.create(cue), {state:cue.state.slice()})]

//cl.orgue = Object.create(orgue.proto) //should make copy of arrays to prevent modifying proto
cl.orgue = orgue.proto

cl.save = function(path) {
  fs.writeFileSync(path, JSON.stringify(this.content))
}

cl.load = function(path) {
  let parsed = JSON.parse(fs.readFileSync(path))
  this.content = parsed.map((v,i,a)=>Object.assign(Object.create(cue), v))
}

cl.addCue = function(n = this.content.length-1, writeState = true) {
  let oldCue = this.content[n]|cue
    , state = writeState ? this.orgue.state : oldCue.state.slice()
    , newCue = Object.assign(Object.create(cue), oldCue, {name:oldCue.name+'|',state:state})
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

cl.go = function(n = 0) {
  if (!this.content[n]) return;
  this.from = this.content[n].state
  this.to = []
  let downMs = this.content[n].downTime * 1000
    , upMs = 0
    , downDiff = Math.max.apply(null, this.from)
    , upDiff = -1
  if (++n != this.content.length) {
    this.to = this.content[n].state
    upMs = this.content[n].upTime * 1000
    upDiff = Math.max.apply(null, this.to)
  }
  
  this.interMs = Math.max(downMs/downDiff, this.orgue.minMsInter, upMs/upDiff)
  this.downFrames = Math.round(downMs/this.interMs)
  this.upFrames = Math.round(upMs/this.interMs)
  this.frameCount = 0
  
  this.orgue.state = this.from
  this.nextFrame = new Date().getTime()
  this.timeOut = setTimeout(()=>{this.inter()}, this.interMs)
}

cl.inter = function() {
  this.frameCount++
  this.nextFrame += this.interMs
  let diff = new Date().getTime() - this.nextFrame
  while(diff >= this.interMs && this.frameCount++) {
    diff -= this.interMs
    this.nextFrame += this.interMs
  }
  
  let loop = false
    , ratioUp
  if (this.frameCount <= this.upFrames) {
    loop = true
    ratioUp = this.to.map(
      (v,i,a)=>Math.round(v * this.frameCount/this.upFrames)
    )
  } else {
    ratioUp = this.to
  }
  if (this.frameCount <= this.downFrames) {
    loop = true
    let ratioDown = this.from.map(
      (v,i,a)=>Math.round((1 - this.frameCount/this.downFrames) * v)
    )
      , len = Math.max(ratioDown.length, ratioUp.length)
      , res = []
    for (let i = 0 ; i < len ; i++) res.push(Math.max(ratioDown[i]|0, ratioUp[i]|0))
    this.orgue.state = res
  } else {
    this.orgue.state = ratioUp
  }
  
  if (loop) this.timeOut = setTimeout(()=>{this.inter()}, this.interMs - diff)
}

cl.stop = function() {
  clearTimeout(this.timeOut)
}

cl.print = function() {
  for(let i = 0 ; i < this.content.length ; i++) {
    let c = this.content[i]
    console.log(c.name, "stay", c.stayTime, "trans", c.transTime, c.state)
  }
}

module.exports = {
  proto: cl
}
