
//DEBUG
let t0 = new Date().getTime()

let or = {
    get state() {
      return or.leds.slice()
    },
    set state(_s) {console.log(new Date().getTime()-t0, "set state to ", _s)
      or.leds = _s 
    },
    get length() {
      return or.nLeds
    }
}

or.leds = [0]
or.nLeds = 16
or.minMsInter = 1

module.exports = {
  proto: or
}
