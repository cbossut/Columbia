const cueList = require("./cueList.js")

let cl = Object.create(cueList.proto)

cl.orgue.patch = [
  {pca:0,leds:[0]},
  {pca:0,leds:[15]}
]

cl.orgue.init()

cl.load("./testOrgue.json")

cl.print()

cl.play()
