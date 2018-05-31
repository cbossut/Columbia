const omx = require('omxplayer-controll')
    , opts = {
      'audioOutput': 'local',
      'disableKeys': true,
      'disableOnScreenDisplay': true
    }
    , path = './sounds/sweep13.wav'

let lastTime = 0
  , lastPos = 0

function end() {
  omx.getPosition((err,pos)=>{console.log('pos',pos-lastPos);lastPos = pos})
  let time = new Date().getTime()
  omx.getDuration((err,dur)=>console.log('left', dur/10000-lastPos))
  console.log('date', time-lastTime)
  lastTime = time
}

omx.on('changeStatus', console.log)
omx.open(path, opts)
omx.playPause()
omx.getStatus(console.log)
omx.getPosition(console.log)
omx.on('aboutToFinish', ()=>setInterval(end, 100).unref())
