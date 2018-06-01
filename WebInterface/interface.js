let socket = io(window.location.href)
socket.on('connect', ()=>setCo(true))
socket.on('reconnect', ()=>setCo(true))
socket.on('disconnect', ()=>setCo(false))

let mem = document.getElementById('mem')
  , add = document.getElementById('addCue')
  , cl = document.getElementById('cueList')
  , cue = document.getElementById('cue')

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
  content.forEach((v,i,a) => {
    let line = cue.cloneNode(true)
    line.removeAttribute('id')
    line.removeAttribute('class')
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




function setCo(co) {
  document.getElementById('co').style.backgroundColor = co?"green":"red"
}
