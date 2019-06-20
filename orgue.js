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

const dmx = require('./DMX.js')
let pca = null
try { // TODO should be protected inside PCA
  pca = require("./pca.js")
} catch(e) {
  console.log('No PCA because :', e)
}

let is16bits = false
  , dmxChanged = false
  , dmxValues = []

let or = {
  get state() {
    return this.levels.slice()
  },
  set state(s) {
    s.forEach((v,i,a)=>this.setLevel(i,v))
  },
  get minMsInter() {
    return 1000/this.freq
  },
  get sixteenBits() {
    return is16bits
  },
  set sixteenBits(b) {
    dmxValues = dmxValues.map(v => Math.round(b ? v * 256 : v / 256))
    is16bits = b
    if ( b ) dmx.set16bits()
    else dmx.set8bits()
  }
}

// TODO param freq ?
//or.freq = 200 // PCA
or.freq = 44 // DMX
or.pcas = pca ? pca.getAddresses() : []
or.patch = [/*
{dimmer} => DMX dimmer
or
{pca, led} => LED N on PCA N
*/]
or.levels = [] // 0-100


or.setLevel = function(n, val) {
  if (!this.patch[n]) return;
  if (val < 0 || !val) val = 0
  else if (val > 100) val = 100
  if (val == this.levels[n]) return;
  this.levels[n] = val
  let p = this.patch[n]
  val = this.patch[n].exp ? Math.round(mapExp(val, this.patch[n].exp)) : val
  if ( p.pca !== undefined && pca ) {
    pca.setLed(this.pcas[p.pca], p.led, Math.round(val * 40.95))
  } else if ( p.dimmer ) {
    dmxValues[p.dimmer - 1] = Math.round(val * (is16bits ? 655.35 : 2.55)) // DMX addresses start from 1
    dmxChanged = true
  } else {
    console.log('Orgue sets nothing n°' + n + ' to ' + val)
  }
}

or.init = function() { // Only to get PCAs addresses
  if ( pca ) pca.init(()=>{ // WARNING ! callback called after 20ms
    this.pcas = pca.getAddresses()
  })
}

or.autoPatch = function(p = true, d = 0) {
  this.patch = []

  if ( p ) {
    this.pcas.forEach((v,j,a)=>{
      for ( let i = 0 ; i < 16 ; i++ ) {
        this.patch.push({
          pca: j,
          led: i
        })
        this.levels.push(0)
      }
    })
  }

  if ( d ) {
    for ( let i = 1 ; i <= d ; i++ ) {
      this.patch.push({dimmer: i})
      this.levels.push(0)
    }
  }
}

// TODO put that in init ? or pca.init should be here outside method too ?
setInterval(applyDmx, or.freq) // TODO different freq for PCA and DMX ?

function applyDmx() {
  if ( dmxChanged ) {
    dmx.write(dmxValues)
    dmxChanged = false
  }
}

function mapExp(v, exp) {
  return Math.pow(v*Math.pow(4095,1/exp)/4095, exp)
}

module.exports = or
