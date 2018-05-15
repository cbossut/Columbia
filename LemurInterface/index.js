// remplir le tableau canvas avec la cueList d'ici et la sauver/charger depuis fichier
// sel une ligne pour set ou call ou ajout
// ajouter une ligne (copie de la ligne précédente ou vide si ajout au début)

const lemurIP = "192.168.1.12",
      port = 8000,
      osc = require("osc"),
      pca = require("./pca.js"),
      fs = require("fs"),
      cuesFilePath = __dirname+"/testCues.json",
      channels = 16

// {Name, Content, Time(transition), Date(son)}
// {'Mise','0,0','5','5:30','Test','','321','50:50','Test2','','321','50:50'}
let cues = [
  ['Mise!!!', [0,0], 5, 5.5],
  ['Test1', [1,2,3], 300, 50+5/6],
  ['Test28', [4000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4095], 1000, 10]
],
    cueSel = 0

let udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: port
})

udpPort.on("ready", ()=>console.log("\nLemur's UDP Port Ready !"))

udpPort.on("message", mess => {
  console.log("Received ", mess.address, " with ", mess.args)
  if (mess.address == "/SandBox/Led1/x") {
    let val = Math.round(mess.args[0])
    console.log("setting to ", val)
    pca.bus.writeByteSync(64,8,val&0xFF)
    pca.bus.writeByteSync(64,9,(val>>8)&0xFF)
  }
  
  if (mess.address == "/ReadMode") {
    let m = pca.readMode()
    console.log(m)
    sendLemur("/State/Mode1/value",toByteArray(m.mode1))
    sendLemur("/State/Mode2/value",toByteArray(m.mode2))
  }
  
  
  if (mess.address == "/CueList/cueSel") cueSel = mess.args[0]
  
  
  
  if (mess.address == "/Cues/Set/x" && mess.args[0]) {
    cues[0] = []
    for(let i = 0 ; i < channels ; i++) {
      cues[0].push(pca.readLed(i))
    }
    sendLemur("/Cues/_1",cues[0])
  }
  
  if (mess.address == "/Cues/Call/x" && mess.args[0]) {
    for(let i = 0 ; i < channels ; i++) {
      sendLemur("/LEDs/_"+i+"/x",cues[0][i])
      pca.setLed(i,cues[0][i])
    }
  }
  
  
  if (mess.address.startsWith("/LEDs/_") && mess.address.endsWith('x')) {
    console.log("set led", parseInt(mess.address.split('_')[1].split('/')[0]), " to ", Math.round(mess.args[0]))
    
    pca.setLed(parseInt(mess.address.split('_')[1].split('/')[0]),Math.round(mess.args[0]))
  }
  
  
  
  if (mess.address == "/TestRequest/x" && mess.args[0]) {
    sendLemur("/CueList/cueSel","mavouille")
    sendLemur("/CueList/content",formatForLemur(cues))
  }
})

udpPort.open()

sendLemur("/Test/fuck","Victory !")


function toByteArray(n) {
  let b = []
  for (let i = 7 ; i >= 0 ; i--) {
    b.push((n>>i)&1)
  }
  return b
}

function sendLemur(addr, args) {
  console.log("Send ", args, " to Lemur's ", addr) //NOTE Debug
  udpPort.send({address:addr,args:args}, lemurIP, port)
}

function formatForLemur(c) {
  let res = []
  for (let i = 0 ; i < c.length ; i++) {
    for (let j = 0 ; j < c[i].length ; j++) {
      res.push(c[i][j].toString())
    }
  }
  return res
}
