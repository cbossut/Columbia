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
or.pcas = [64]
or.patch = []
or.levels = []
for (let i = 0 ; i < 16 ; i++) {
  or.patch.push({
    pca: 0,
    leds: [i]
  })
  or.levels.push(0)
}

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
  pca.init(this.pcas, ()=>{let s = this.levels;this.levels = [];this.state = s})
  this.freq = 200
}

module.exports = {
  proto: or
}
