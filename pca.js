const i2c = require('i2c-bus')
    , busNumber = 1 // RaspberryPi configuration
    , bus = i2c.openSync(busNumber)
    , LED0ON = 6 // ON_L-ON_H-OFF_L-OFF_H
    , ALLCALLADDR = 112

let pca = {}

pca.getAddresses = function() {
  return bus.scanSync(64,111)
}

pca.init = function(cb) {
  bus.sendByteSync(0,6) // Software Reset
  setTimeout(()=>{
    bus.writeByteSync(ALLCALLADDR,0,0b00100001) //out of sleep and autoincrement
    bus.writeByteSync(ALLCALLADDR,0xFB,0) //Remove all led force on
    cb()
  }, 20)
}

pca.setLed = function(addr, n, val) {
  if (n < 0 || n > 15) return;
  if (val <= 0) bus.writeByteSync(addr, LED0ON+3+n*4, 16)
  else bus.writeWordSync(addr, LED0ON+2+n*4, val)
}

module.exports = pca
