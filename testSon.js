const omx = require('omxplayer-controll')
    , opts = {
      'audioOutput': 'local',
      'disableKeys': true,
      'disableOnScreenDisplay': true
    }
    , path = './sounds/sweep13.wav'

let lastTime = 0
  , lastPos = 0

omx.on('changeStatus', s=>{
  let t = new Date().getTime()
  console.log(s)
  omx.playPause()
  console.log('tim', t-lastTime, 'pos', s.pos-lastPos)
  lastPos = s.pos
  lastTime = t
})
lastTime = new Date().getTime()
omx.open(path, opts)
