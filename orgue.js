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


or.setLevel = function(n, val) {
  if (!this.patch[n]) return;
  if (val < 0 || !val) val = 0
  else if (val > 4095) val = 4095
  if (val == this.levels[n]) return;
  this.levels[n] = val
  let leds = this.patch[n].leds
    , addr = this.pcas[this.patch[n].pca]
  val = this.patch[n].exp ? Math.round(mapExp(val, this.patch[n].exp)) : val
  for (let j = 0 ; j < leds.length ; j++) {
    pca.setLed(addr, leds[j], val)
  }
}

or.init = function(p) {
  pca.init(()=>{
    this.pcas = pca.getAddresses()
    let s = this.levels
    this.levels = []
    this.state = s
    this.patch = []
    this.pcas.forEach((v,j,a)=>{
      for (let i = 0 ; i < 16 ; i++) {
        this.patch.push({
          pca: j,
          leds: [i]
        })
        this.levels.push(0)
      }
    })
    //TODO ne charge que les 'exp' sur un patch droit !!!
    this.patch.forEach((v,i,a)=>{
      Object.keys(p[i]).forEach(k=>{
        if (!v[k]) v[k] = p[i][k]
      })
    })
  })
  this.freq = 200
}

function mapExp(v, exp) {
  return Math.pow(v*Math.pow(4095,1/exp)/4095, exp)
}

module.exports = or
