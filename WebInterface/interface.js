let socket = io(window.location.href)
socket.on('connect', ()=>setCo(true))
socket.on('reconnect', ()=>setCo(true))
socket.on('disconnect', ()=>setCo(false))

interact('#co').on('tap', ()=>socket.emit('print'))

let mem = document.getElementById('mem')
  , add = document.getElementById('addCue')
  , cl = document.getElementById('cueList')
  , cue = document.getElementById('cue')
  , prog = document.getElementById('progress')
  , selCueIndex = -1

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
    el.value = v.upTime
    el = el.nextElementSibling
    el.value = v.downTime
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

document.getElementById('go').onclick = ()=>{
  socket.emit('go', selCueIndex)
}

socket.on('playStatus', o=>{
  if (!o.play) {
    nextCue()
    prog.innerHTML = ''
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










function setCo(co) {
  document.getElementById('co').style.backgroundColor = co?"green":"red"
}
