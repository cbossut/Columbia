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
addButton(cueListDiv, 'Go', ()=>socket.emit('go', cue.value))
addButton(cueListDiv, 'Stop', ()=>socket.emit('stop'))
addButton(cueListDiv, 'Print', ()=>socket.emit('print'))

let status = document.createElement('p')
status.innerHTML = 'Non'
cueListDiv.appendChild(status)
socket.on('playStatus', st=>status.innerHTML = (st.play?'Oui':'Non')+st.time)

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
      , up = document.createElement('input')
      , down = document.createElement('input')
    name.value = v.name
    name.onchange = function() {
      socket.emit('cueChange', {n:i, change:{name:this.value}})
    }
    up.type = 'number'
    up.step = .001
    up.value = v.upTime
    up.onchange = function() {
      socket.emit('cueChange', {n:i, change:{upTime:this.value}})
    }
    down.type = 'number'
    down.step = .001
    down.value = v.downTime
    down.onchange = function() {
      socket.emit('cueChange', {n:i, change:{downTime:this.value}})
    }
    line.appendChild(n)
    line.appendChild(name)
    line.appendChild(state)
    line.appendChild(up)
    line.appendChild(down)
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
    orgueDiv.appendChild(document.createTextNode(i+1))
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