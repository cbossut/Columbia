let socket = io(window.location.href)
const factor = 40

socket.on('connect', ()=>setCo(true))
socket.on('reconnect', ()=>setCo(true))
socket.on('disconnect', ()=>setCo(false))

interact('#co').on('tap', ()=>socket.emit('print'))

let mem = document.getElementById('mem')
  , add = document.getElementById('addCue')
  , cl = document.getElementById('cueList')
  , cue = document.getElementById('cue')
  , fader = document.getElementById('fader')
  , prog = document.getElementById('progress')
  , selCueIndex = -1
  , playing = false

mem.onkeyup = ()=>{
  add.disabled = !isMem()
}

add.onclick = ()=>{
  let c = cl.firstElementChild
  while(c && beforeMem(c.children[1].innerHTML)) c = c.nextElementSibling
  
  socket.emit(
    'addCue',
    mem.value,
    c ? parseInt(c.firstElementChild.innerHTML)-2 : cl.children.length-1
  )
  
  mem.value = ''
  add.disabled = true
}

function isMem() {
  return mem.value.split('.').every(v=>parseInt(v))
}

function beforeMem(newMem) {
  let o = mem.value.split('.').map(v=>parseInt(v))
    , n = newMem.split('.').map(v=>parseInt(v))
    , i
  for(i = 0 ; o[i] == n[i] && o[i] ; i++);
  return ! (n[i] > o[i])
}

socket.on('cueList', content => {
  cl.innerHTML = ''
  unselCue()
  content.forEach((v,i,a) => {
    let line = cue.cloneNode(true)
    line.removeAttribute('id')
    line.classList.remove('proto')
    let el = line.firstElementChild
    el.innerHTML = i+1
    el = el.nextElementSibling
    el.innerHTML = v.name
    el = el.nextElementSibling
    let inp = el.children[0]
    inp.num = i
    inp.value = v.upTime
    inp.onchange = inp.onkeyup = function() {
      socket.emit('cueChange', {n:this.num, change:{upTime:this.value}})
    }
    el = el.nextElementSibling
    el.value = v.downTime
    inp = el.children[0]
    inp.num = i
    inp.onchange = inp.onkeyup = function() {
      socket.emit('cueChange', {n:this.num, change:{downTime:this.value}})
    }
    el = el.nextElementSibling
    el.innerHTML = v.date
    cl.appendChild(line)
  })
})

interact('.cueTR')
.pointerEvents({ignoreFrom: 'input'})
.on('tap', (e)=>{selCue(e.currentTarget)})

document.getElementById('delCue').onclick = ()=>{
  socket.emit('delete', selCueIndex)
}

document.getElementById('upCue').onclick = ()=>{
  socket.emit('update', selCueIndex)
}

document.getElementById('go').onclick = function() {
  if (playing) {
    socket.emit('stop')
    stop()
  } else {
    playing = true
    this.innerHTML = 'STOP'
    socket.emit('go', selCueIndex)
  }
}

function stop() {
  prog.innerHTML = ''
  playing = false
  document.getElementById('go').innerHTML = 'GO'
}

socket.on('playStatus', o=>{
  if (!playing) return;
  if (!o.play) {
    nextCue()
    stop()
    return;
  }
  prog.innerHTML = o.time
})


function selCue(trNode) {
  if (!trNode) {
    unselCue()
    return;
  }
  
  document.querySelectorAll('.cueTR.sel')
    .forEach(v=>v.classList.remove('sel'))
  trNode.classList.add('sel')
  selCueIndex = parseInt(trNode.firstElementChild.innerHTML) - 1
  
  socket.emit('apply', selCueIndex)
  
  document.querySelectorAll('.cueAct')
    .forEach(v=>v.disabled = false)
}

function unselCue() {
  document.querySelectorAll('.cueTR.sel')
    .forEach(v=>v.classList.remove('sel'))
  selCueIndex = -1
  
  document.querySelectorAll('.cueAct')
    .forEach(v=>v.disabled = true)
}

function nextCue() {
  selCue(document.querySelector('.cueTR.sel').nextElementSibling)
}


let faders = []
socket.on('patch', patch => {
  let panel = document.getElementById('orgueP')
  panel.innerHTML = ''
  faders = []
  for (let i = 0 ; i < patch.length ; i++) {
    let f = fader.cloneNode(true)
    f.removeAttribute('id')
    f.classList.remove('proto')
    f.firstChild.replaceWith(i+1)
    f.num = i
    f.lastChild.replaceWith(0)
    f.val = 0
    Object.defineProperty(f, 'value', {
      enumerable: true,
      configurable: true,
      get: function() {return this.val},
      set: function(v) {
        this.val = v
        this.lastChild.replaceWith(v)
      }
    })
    panel.appendChild(f)
    faders.push(f)
  }
})

interact('.fader').draggable({
  onmove: e=>{
    if (!e.dy) return;
    let f = e.currentTarget
    f.value = limit(f.value - parseInt(e.dy)/2)
    socket.emit('orgue', {led:f.num, val:f.value*factor})
  }
})

socket.on('orgueState', s => {
  faders.forEach((v,i,a)=>v.value = Math.ceil(100*s[i]/factor)/100)
})





function limit(val, max=100, min=0) {
  if (val < min) val = min
  else if (val > max) val = max
  return val
}

function setCo(co) {
  document.getElementById('co').style.backgroundColor = co?"green":"red"
}
