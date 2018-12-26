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

// Inspired from
// https://github.com/akualab/dmx/blob/master/dmx.go
// and
// https://github.com/kim-toms/ultradmx-micro/blob/master/lib/ultradmx-micro.rb

const SerialPort = require('serialport')
    , DMX = new SerialPort('/dev/DMX', {baudRate:115200})
    , packetStart = [0x7E, 6]
    , packetEnd = 0xE7

module.exports.write = function(data, start = 1) {
  if (start > 0) {
    data = Array(start).fill(0).concat(data)
  }
  //DEBUG console.log(data)
  let packetLength = [data.length & 0xFF, (data.length >> 8) & 0xFF]
  DMX.write(packetStart.concat(packetLength, data, packetEnd))
}

module.exports.close = function() {DMX.close()}
