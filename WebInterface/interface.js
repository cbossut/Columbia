let socket = io(window.location.href)
socket.on('connect', ()=>console.log(socket.id))

let cueListDiv = document.createElement('div')
  , orgueDiv = document.createElement('div')

document.body.appendChild(cueListDiv)
document.body.appendChild(orgueDiv)

let sel = document.createElement('select')
orgueDiv.appendChild(sel)
sel.onchange = function() {console.log(this.value)}

let nSliders = 2
  , sliders = []

for (let i = 0 ; i < nSliders ; i++) {
  orgueDiv.appendChild(document.createElement('br'))
  orgueDiv.appendChild(document.createTextNode(i))
  let s = document.createElement('input')
    , p = document.createElement('span')
    , o = document.createElement('option')
  s.type = 'range'
  s.min = 0
  s.max = 4095
  s.value = 0
  p.innerHTML = 0
  s.oninput = function() {
    p.innerHTML = this.value
    socket.emit('orgue', {led:i, val:this.value})
  }
  o.value = i
  o.innerHTML = 'led'+i
  sel.appendChild(o)
  orgueDiv.appendChild(s)
  orgueDiv.appendChild(p)
}
