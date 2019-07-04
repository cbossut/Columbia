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
    , packetStart = [0x7E, 6]
    , packetEnd = 0xE7
//    , minSize = 24 // min DMX frame size
    , minSize = 64 // min size for lame 16bit DMX decoder
    , fs = require('fs')

let twoChannelMode = false
  , lastVals = []
  , DMX = null

if ( fs.existsSync('/dev/DMX')) {
  DMX = new SerialPort('/dev/DMX', {baudRate:115200})
} else {
  console.log('No DMX found ! Print instead')
}

module.exports.write = function(data, start = 0) {

  let vals = []

  // Format data
  for ( let i = 0 ; i < data.length ; i++ ) {
    let v = data[i]

    if ( !v || v < 0 ) v = 0

    if ( twoChannelMode ) {
      if (v >= 65536 ) v = 0
      vals.push(Math.floor(v/256))
      vals.push(v%256)
    } else {
      if ( v >= 256 ) vals.push(0)
      else vals.push(v)
    }
  }

  // Repetition filter
  if ( vals.every((v,i,a) => v == lastVals[i]) ) return;
  lastVals = vals

  // Offset DMX address
  if ( start > 0 ) {
    vals = Array(twoChannelMode ? start*2 : start).fill(0).concat(vals)
  }

  // Fill min frame size
  if ( vals.length < minSize ) {
    vals.push(...Array(minSize - vals.length).fill(0))
  }

  // Format and write
  let packetLength = [(vals.length + 1) & 0xFF, (vals.length >> 8) & 0xFF]
  if ( DMX ) DMX.write(packetStart.concat(packetLength, 0, vals, packetEnd))
  else for ( v in vals ) if ( vals[v] ) console.log('DMX :', v, vals[v])
}

module.exports.close = function() {DMX ? DMX.close() : null}

module.exports.set16bits = function() {twoChannelMode = true}

module.exports.set8bits = function() {twoChannelMode = false}
