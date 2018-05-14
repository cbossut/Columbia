const i2c = require('i2c-bus')
    , busNumber = 1 // RaspberryPi configuration
    , bus = i2c.openSync(busNumber)
    , addr = 64 // Hard-soldered on the PCA card (0x40)
    , LED0ON = 6 // ON_L-ON_H-OFF_L-OFF_H

bus.writeByteSync(addr,0,0b00100001) //out of sleep and autoincrement
bus.writeByteSync(64,0xFB,0) //Remove all led force on

// Counts Leds from 0 to 15

module.exports = {
  bus: bus,
  reset: softwareReset,
  readMode: readModeSeparately,
  setLed: setPWM,
  readLed: readPWM
}

function readModeSeparately() {
  return {
    mode1: bus.readByteSync(addr,0),
    mode2: bus.readByteSync(addr,1)
  }
}

function setPWM(ledN, val) {
  if (!val) bus.writeByteSync(addr,ledOffH(ledN),16)
  else bus.writeWordSync(addr,ledOffL(ledN),val)
}

function readPWM(ledN) {
  let val = bus.readWordSync(addr,ledOffL(ledN))
  return val >= 4096 ? 0 : val
}

function softwareReset() {
  bus.sendByteSync(0,6)
}

function ledOnL(n) {return LED0ON+n*4}
function ledOnH(n) {return LED0ON+1+n*4}
function ledOffL(n) {return LED0ON+2+n*4}
function ledOffH(n) {return LED0ON+3+n*4}
