const clueList = require("./cueList.js")

let cl = Object.create(clueList.proto)

cl.content[0].stayTime = 2
cl.content[0].transTime = 5
cl.orgue.state = [10,20,30,40,50,60,70,80,100,200,300,400,500,600,700,800]
cl.addCue(0)
cl.addCue()
cl.content[2].state[10] = 4095
cl.content[2].state[11] = 1500
cl.content[2].transTime = 1.5

cl.print()

cl.save("./testCl.json")

cl.load("./testCl.json")

cl.print()

cl.play()

module.exports = {e: cl}
