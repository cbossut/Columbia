let socket = io(window.location.href)
socket.on('connect', ()=>console.log(socket.id))

let cueListDiv = document.createElement('div')
  , orgueDiv = document.createElement('div')

document.body.appendChild(cueListDiv)
document.body.appendChild(orgueDiv)

addButton(cueListDiv, 'Actualiser', ()=>socket.emit('refresh'))
let files = document.createElement('select')
  , opts = []
/*
  , selFile
files.onchange = function() {
  selFile = opts[this.value]
}
*/
socket.on('files', fileNames=>{
  for (let i = 0 ; i < fileNames.length ; i++) {
    let f = fileNames[i]
    if (opts.includes(f)) continue;
    opts.push(f)
    let o = document.createElement('option')
    o.innerHTML = f
    files.appendChild(o)
  }
})
cueListDiv.appendChild(files)
addButton(cueListDiv, 'Charger', ()=>socket.emit('load', files.value))
cueListDiv.appendChild(document.createTextNode(' | '))
let savePathEntry = document.createElement('input')
cueListDiv.appendChild(savePathEntry)
addButton(cueListDiv, 'Enregistrer', ()=>socket.emit('save', savePathEntry.value))

cueListDiv.appendChild(document.createElement('br'))

let cue = document.createElement('input')
cue.type = 'number'
cue.value = 0
cueListDiv.appendChild(cue)
addButton(cueListDiv, 'Ajouter', ()=>socket.emit('add', cue.value++))
addButton(cueListDiv, 'Jouer', ()=>socket.emit('play'))
addButton(cueListDiv, 'Stop', ()=>socket.emit('stop'))

cueListDiv.appendChild(document.createElement('br'))

let cueTab = document.createElement('ul')
cueListDiv.appendChild(cueTab)
socket.on('cueList', cl => {
  cue.value = cl.length - 1
  cueTab.innerHTML = ''
  cl.forEach((v,i,a) => {
    let line = document.createElement('li')
      , n = document.createTextNode(i)
      , name = document.createElement('input')
      , state = document.createTextNode(v.state)
      , stay = document.createElement('input')
      , trans = document.createElement('input')
    name.value = v.name
    name.onchange = function() {
      socket.emit('cueChange', {n:i, change:{name:this.value}})
    }
    stay.type = 'number'
    stay.step = .001
    stay.value = v.stayTime
    stay.onchange = function() {
      socket.emit('cueChange', {n:i, change:{stayTime:this.value}})
    }
    trans.type = 'number'
    trans.step = .001
    trans.value = v.transTime
    trans.onchange = function() {
      socket.emit('cueChange', {n:i, change:{transTime:this.value}})
    }
    line.appendChild(n)
    line.appendChild(name)
    line.appendChild(state)
    line.appendChild(stay)
    line.appendChild(trans)
    addButton(line, '-', ()=>socket.emit('delete', i))
    addButton(line, '<-', ()=>socket.emit('update', i))
    addButton(line, '->', ()=>socket.emit('apply', i))
    cueTab.appendChild(line)
  })
})




let sliders = []

socket.on('patch', patch => {
  orgueDiv.innerHTML = ''
  sliders = []

  for (let i = 0 ; i < patch.length ; i++) {
    orgueDiv.appendChild(document.createElement('br'))
    orgueDiv.appendChild(document.createTextNode(i))
    let s = document.createElement('input')
      , v = document.createElement('input')
    s.type = 'range'
    s.min = 0
    s.max = 4095
    s.value = 0
    let up = function() {
      s.value = this.value
      v.value = this.value
      socket.emit('orgue', {led:i, val:this.value})
    }
    s.oninput = up
    v.type = 'number'
    v.value = 0
    v.onchange = up
    orgueDiv.appendChild(s)
    orgueDiv.appendChild(v)
    sliders.push({fader:s, number:v})
  }
})





socket.on('orgueState', s => {
  sliders.forEach((v,i,a) => {
    v.fader.value = s[i]
    v.number.value = s[i]
  })
})

function addButton(container, name, action) {
  let bt = document.createElement('button')
  bt.innerHTML = name
  bt.onclick = action
  container.appendChild(bt)
  return bt
}
