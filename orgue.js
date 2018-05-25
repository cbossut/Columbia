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
or.pcas = [64, 65, 66]
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
    try {
      this.state = s
    } catch (error) {console.log(error)}
  })
  this.freq = 200
}

module.exports = {
  proto: or
}
