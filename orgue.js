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

const pca = require("./pca.js")

let or = {
    get state() {
      return this.levels.slice()
    },
    set state(s) {
      s.forEach((v,i,a)=>this.setLevel(i,v))
    },
    get minMsInter() {
      return 1000/this.freq
    }
}

or.freq = 200
or.pcas = pca.getAddresses()
or.patch = []
or.levels = []

or.pcas.forEach((v,j,a)=>{
  for (let i = 0 ; i < 16 ; i++) {
    or.patch.push({
      pca: j,
      leds: [i]
    })
    or.levels.push(0)
  }
})

or.setLevel = function(n, val) {
  if (!this.patch[n]) return;
  if (val < 0 || !val) val = 0
  else if (val > 4095) val = 4095
  if (val == this.levels[n]) return;
  this.levels[n] = val
  let leds = this.patch[n].leds
    , addr = this.pcas[this.patch[n].pca]
  for (let j = 0 ; j < leds.length ; j++) {
    pca.setLed(addr, leds[j], val)
  }
}

or.init = function() {
  pca.init(()=>{
    let s = this.levels
    this.levels = []
    this.state = s
  })
  this.freq = 200
}

module.exports = or
