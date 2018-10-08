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

const i2c = require('i2c-bus')
    , busNumber = 1 // RaspberryPi configuration
    , bus = i2c.openSync(busNumber)
    , LED0ON = 6 // ON_L-ON_H-OFF_L-OFF_H
    , ALLCALLADDR = 112

let pca = {}
  , addrs = bus.scanSync(64,111)


pca.getAddresses = function() {
  return addrs
}

pca.init = function(cb) {
  // WARNING ! the callback is called instantly if no pcas, which is not the same as with pcas (20ms)
  if (!addrs.length) {console.log('no pcas !!!'); cb(); return;}
  bus.sendByteSync(0,6) // Software Reset
  setTimeout(()=>{
    bus.writeByteSync(ALLCALLADDR,0,0b00100001) //out of sleep and autoincrement
    bus.writeByteSync(ALLCALLADDR,0xFB,0) //Remove all led force on
    cb()
  }, 20)
}

pca.setLed = function(addr, n, val) {
  if (n < 0 || n > 15) return;
  if (addrs.indexOf(addr) == -1) {console.log('no addr', addr, n, val); return;}
  if (val <= 0) bus.writeByteSync(addr, LED0ON+3+n*4, 16)
  else bus.writeWordSync(addr, LED0ON+2+n*4, val)
}

module.exports = pca
