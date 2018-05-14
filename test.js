const clueList = require("./cueList.js")

let cl = Object.create(clueList.proto)

cl.content[0].stayTime = 2
cl.content[0].transTime = 5
cl.orgue.state = [1,2,3,4,5,6,7,8,1,2,3,4,5,6,7,8]
cl.addCue(0)
cl.addCue()
cl.content[2].state[10] = 4095
cl.content[2].state[11] = 1500
cl.content[2].transTime = 1.5

cl.print()

cl.play()

module.exports = {e: cl}
