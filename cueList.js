const orgue = require("./orgue.js")
    , fs = require('fs')

let cl = {}
  , cue = {
      name: 'Mise'
    , state: [0]
//    , upTime: 0
    , stayTime: 0
    , transTime: 0
    , date: 0
    }

cl.content = [Object.assign(Object.create(cue), {state:cue.state.slice()})]

cl.orgue = Object.create(orgue.proto)

cl.save = function(path) {
  fs.writeFileSync(path, JSON.stringify(this.content))
}

cl.load = function(path) {
  let parsed = JSON.parse(fs.readFileSync(path))
  this.content = parsed.map((v,i,a)=>Object.assign(Object.create(cue), v))
}

cl.addCue = function(n = this.content.length-1, writeState = true) {
  let oldCue = this.content[n]
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

cl.play = function(n = 0) {
//  this.t0 = new Date().getTime()
//  debugger;
  if (!this.content[n]) return;
  this.index = n
  this.step = 's'
  this.to = this.content[n].state
  this.nextFrame = new Date().getTime()
  this.go()
}

cl.go = function() {
//  console.log(new Date().getTime()-this.t0, this.to, this.nextFrame-this.t0)
//  debugger;
  if (this.index == this.content.length) return;
  this.orgue.state = this.to
  this.from = this.to
  let time
    , derive = new Date().getTime() - this.nextFrame
  switch(this.step) {
    case 's':
      time = this.content[this.index].stayTime*1000
      this.step = 't'
      this.to = this.from
      this.nextFrame += time
      this.timeOut = setTimeout(()=>{this.go()}, time-derive)
      break;
      
    case 't':
      time = this.content[this.index].transTime*1000
      this.index++
      this.step = 's'
      if (this.index == this.content.length) this.to = [0]
      else this.to = this.content[this.index].state
      if (!time) {
        this.timeOut = setTimeout(()=>{this.go()}, 0)
        break;
      }
      let ll = this.from
        , ss = this.to
      if (this.from.length < this.to.length) {
        ll = this.to
        ss = this.from
      }
      let diff = Math.max.apply(null, ll.map(
        (v,i,a)=>{
          if (!v) a[i] = 0
          if (!ss[i]) ss[i] = 0
          return Math.abs((ss[i]|0)-v)
        }))
      this.interMs = Math.max(time/diff, this.orgue.minMsInter)
      this.frames = Math.round(time/this.interMs)
      this.remainingFrames = this.frames
      this.timeOut = setTimeout(()=>{this.inter()}, this.interMs-derive)
  }
}

cl.inter = function() {
  this.remainingFrames--
  this.nextFrame += this.interMs
  let diff = new Date().getTime() - this.nextFrame
  while(diff >= this.interMs && this.remainingFrames--) {debugger;
    diff -= this.interMs
    this.nextFrame += this.interMs
  }
  if (this.remainingFrames <= 0) {
    this.go()
    return
  }
  let ratio = this.remainingFrames/this.frames
  this.orgue.state = this.from.map((v,i,a)=>Math.round((this.to[i]|0)-ratio*((this.to[i]|0)-v)))
  this.timeOut = setTimeout(()=>{this.inter()}, this.interMs - diff)
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
