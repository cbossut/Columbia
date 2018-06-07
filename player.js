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
    this.dur = 0
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

player.play = function(p = -1) {
  if (!this.path) return;
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
  if (this.run && !this.paused) {
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
}

player.stop = function() {console.log(this.getPos(), this.dur)
  this.run = false
  this.pos = -1
  this.refTime = this.refPos = 0
  clearTimeout(player.finish)
  omx.stop()
}

player.getPos = function() {
  if (!this.refTime) return this.pos
  console.log('mypos')
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
      console.log("Time's up!!'")
    }, player.dur-player.refPos+500)
  })
}

omx.on('finish', ()=>{console.log('finish');player.stop();player.debug()})

player.debug = function(s) {
  if (!s) console.log(this.run, this.paused, this.dur, this.getPos())
  else {
    console.log('state', s.status, this.run, this.paused)
    console.log('pos', s.pos, this.getPos())
  }
}

omx.on('changeStatus', s=>{player.debug(s)})

module.exports = player
