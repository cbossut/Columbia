const omx = require('omxplayer-controll')
    , opts = {
      'audioOutput': 'local',
      'disableKeys': true,
      'disableOnScreenDisplay': true
    }
    , path = './sounds/test_panoramique.aif'

let startTime
  , startPos

omx.once('changeStatus', s=>{
  startTime = new Date().getTime()
  startPos = s.pos/1000
  console.log(s, startTime)
  setTimeout(()=>{
    console.log('dring')
    omx.getPosition(console.log)
    console.log(new Date().getTime() - startTime + startPos)
  }, 16410-startPos)
  setTimeout(()=>{
    console.log('dring2')
    omx.playPause()
    omx.getPosition(console.log)
    console.log(new Date().getTime() - startTime + startPos)
  }, 21280-startPos)
})
omx.on('changeStatus', console.log)
omx.open(path, opts)
//omx.setPosition(100000, console.log )
