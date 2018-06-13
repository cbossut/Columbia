/*
Copyright ou © ou Copr. Clément Bossut, (2018)
<bossut.clement@gmail.com>

Ce logiciel est un programme informatique servant à écrire et jouer une conduite lumière synchronisée avec du son sur une Raspberry Pi avec PCA8596. 

Ce logiciel est régi par la licence CeCILL soumise au droit français et
respectant les principes de diffusion des logiciels libres. Vous pouvez
utiliser, modifier et/ou redistribuer ce programme sous les conditions
de la licence CeCILL telle que diffusée par le CEA, le CNRS et l'INRIA 
sur le site "http://www.cecill.info".
*/

//POLYFILL NodeList.forEach for Chrome before 51
if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = function (callback, thisArg) {
    thisArg = thisArg || window;
    for (var i = 0; i < this.length; i++) {
      callback.call(thisArg, this[i], i, this);
    }
  };
}

const factor = 40

let socket = io(window.location.href)
socket.on('connect', ()=>setCo(true))
socket.on('reconnect', ()=>setCo(true))
socket.on('disconnect', ()=>setCo(false))

socket.on('debug', d => {
  document.getElementById('debug').innerHTML = d.message
  console.log(d)
})

interact('#co').on('tap', ()=>socket.emit('print'))


let files = document.getElementById('files')
  , saveName = document.getElementById('fileName')

document.getElementById('load')
  .onclick = ()=>socket.emit('load', files.value)
document.getElementById('save')
  .onclick = ()=>{
    socket.emit('save', saveName.value)
    socket.emit('refresh')
  }
socket.on('files', f=>{
  populate(files, f)
})

document.getElementById('play').onclick = function() {
  if (this.encours) {
    this.encours = false
    this.innerHTML = 'Tester'
    socket.emit('cut')
  } else {
    this.encours = true
    this.innerHTML = 'STOP'
    socket.emit('playtest', soundTimes.pos)
  }
}

document.getElementById('patchShow').onclick = function() {
  let st = document.getElementById('patchP').style
  if (st.display == 'none') st.display = 'initial'
  else st.display = 'none'
}


let soundFiles = document.getElementById('soundFiles')
  , playBtn = document.getElementById('soundPlay')
  , soundTimes = {
      container: document.getElementById('soundContainer'),
      posSpan: document.getElementById('soundPos'),
      posBar: document.getElementById('soundBar'),
      durSpan: document.getElementById('soundDur'),
      minSpan: document.getElementById('soundMin'),
      maxSpan: document.getElementById('soundMax'),
      l: 0,
      h: 0,
      d: -1,
      p: -1,
      get min() {return this.l},
      get max() {return this.h},
      get dur() {return this.d},
      get pos() {return this.p},
      set min(m) {
        this.l = m
        this.minSpan.innerHTML = formatTime(m)
      },
      set max(m) {
        this.h = m
        this.maxSpan.innerHTML = formatTime(m)
      },
      set dur(d) {
        this.d = d
        this.durSpan.innerHTML = formatTime(d)
        this.min = 0
        this.max = d
        this.pos = 0
      },
      set pos(p) {
        this.p = p
        this.posSpan.innerHTML = formatTime(p)
        let percent = limit(100*(p - this.min)/(this.max - this.min))
        this.posBar.style.width = percent ? percent+'%' : '3px'
      }
    }
  , soundPlaying = false
  , moveWhilePlaying = false

socket.on('soundFiles', f=>{
  populate(soundFiles, f)
})
document.getElementById('soundLoad').onclick = ()=>{
  socket.emit('loadSound', soundFiles.value)
}
playBtn.onclick = ()=>{
  soundPlaying
    ? socket.emit('pauseSound')
  : socket.emit('playSound', soundTimes.pos)
}

socket.on('soundInfo', i=>{
  playBtn.disabled = false
  soundTimes.dur = i.duration
  document.getElementById('soundRepresentation').innerHTML = i.file
})
socket.on('soundPlayStat', s=>{
  if (!moveWhilePlaying) soundTimes.pos = s.pos
  if (s.playing != soundPlaying) {
    soundPlaying = s.playing
    playBtn.innerHTML = soundPlaying ? 'Pause' : 'Lire'
  }
})

interact(soundTimes.posBar).resizable({
  edges: {right: true},
  onstart: e=>{
    if (soundPlaying){
      socket.emit('pauseSound')
      moveWhilePlaying = true
    }
  },
  onmove: e=>{
    if (!e.dx) return;
    let tot = soundTimes.container.getBoundingClientRect().width
      , ratio = limit(Math.floor(e.rect.width), tot) / tot
    soundTimes.posBar.style.width = ratio ? ratio*100+'%' : '3px'
    soundTimes.p = ratio*(soundTimes.max-soundTimes.min)+soundTimes.min
    soundTimes.posSpan.innerHTML = formatTime(soundTimes.pos)
  },
  onend: e=>{
    if (moveWhilePlaying) {
      socket.emit('playSound', soundTimes.pos)
      moveWhilePlaying = false
    }
  }
})


let mem = document.getElementById('mem')
  , add = document.getElementById('addCue')
  , cl = document.getElementById('cueList')
  , cue = document.getElementById('cue')
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
    inp = el.children[0]
    inp.num = i
    inp.value = v.downTime
    inp.onchange = inp.onkeyup = function() {
      socket.emit('cueChange', {n:this.num, change:{downTime:this.value}})
    }
    el = el.nextElementSibling
    if (v.date == -1) {
      el.innerHTML = ''
      let btn = document.createElement('button')
      btn.innerHTML = 'Marquer'
      btn.onclick = function() {
        socket.emit('cueChange', {n:i, change:{date: soundTimes.pos}})
        el.innerHTML = formatTime(soundTimes.pos)
      }
      el.appendChild(btn)
    } else {
      el.innerHTML = formatTime(v.date)
    }
    cl.appendChild(line)
  })
})

interact('.cueTR')
.pointerEvents({ignoreFrom: 'input'})
.on('tap', e=>selCue(e.currentTarget))

document.getElementById('delCue').onclick = ()=>{
  socket.emit('delete', selCueIndex)
}

document.getElementById('upCue').onclick = ()=>{
  socket.emit('update', selCueIndex)
}

document.getElementById('go').onclick = function () {
  if (this.disabled) return;
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
  prog.innerHTML = Math.round(o.time*10)/10
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
  let seled = document.querySelector('.cueTR.sel')
  if (!seled) selCue(cl.firstElementChild)
  else selCue(seled.nextElementSibling)
}

function prevCue() {
  let seled = document.querySelector('.cueTR.sel')
  if (!seled) selCue(cl.lastElementChild)
  else selCue(seled.previousElementSibling)
}


let faders = []
  , fader = document.getElementById('fader')
  , plist = document.getElementById('patchList')
  , pline = document.getElementById('patchLine')
  , selFader = null

socket.on('patch', o => {
  let patch = o.patch
    , pcas = o.pcas
    , panel = document.getElementById('orgueP')
  panel.innerHTML = ''
  plist.innerHTML = ''
  faders = []
  patch.forEach((v,i,a) => {
    let f = fader.cloneNode(true)
    f.removeAttribute('id')
    f.classList.remove('proto')
    f.childNodes[0].textContent = v.name || i+1
    f.num = i
    f.childNodes[2].textContent = 0
    f.val = 0
    Object.defineProperty(f, 'value', {
      enumerable: true,
      configurable: true,
      get: function() {return this.val},
      set: function(v) {
        this.val = v
        this.childNodes[2].textContent = v
      }
    })
    panel.appendChild(f)
    faders.push(f)
    if (i%12 == 11) {
      panel.appendChild(document.createElement('br'))
      panel.appendChild(document.createElement('br'))
      panel.appendChild(document.createElement('br'))
      panel.appendChild(document.createElement('br'))
    }
    
    let line = pline.cloneNode(true)
    line.removeAttribute('id')
    line.classList.remove('proto')
    let el = line.firstElementChild
    el.innerHTML = i+1
    el = el.nextElementSibling
    let inp = el.children[0]
    inp.value = v.name || '-'
    inp.onchange = function() {
      f.childNodes[0].textContent = this.value
      socket.emit('patchChange', {n: i, new: {name: this.value}})
    }
    el = el.nextElementSibling
    let pca = el.children[0]
      , led = el.children[1]
    populate(pca, pcas)
    pca.selectedIndex = v.pca
    pca.onchange = function() {
      socket.emit('patchChange', {n: i, new: {pca: this.selectedIndex}})
    }
    led.value = v.leds[0] + 1 //TODO multiple ?
    led.onchange = function() {
      socket.emit('patchChange', {n: i, new: {leds: [this.value - 1]}})
    }
    el = el.nextElementSibling
    let c = el.children[0]
    c.value = v.exp || 1
    c.onchange = function() {
      socket.emit('patchChange', {n: i, new: {exp: this.value}})
    }
    plist.appendChild(line)
  })
})

interact('.fader').draggable({
  onmove: e=>changeFader(e.currentTarget, - parseInt(e.dy)/2)
})
.pointerEvents()
.on('tap', e=>selectFader(e.currentTarget))

socket.on('orgueState', s => {
  faders.forEach((v,i,a)=>v.value = Math.ceil(100*s[i]/factor)/100)
})

function changeFader(f, d) {
  if (!d || !f) return;
  f.value = Math.ceil(100*Math.round(factor*limit(f.value + d))/factor)/100
  socket.emit('orgue', {led:f.num, val:f.value*factor})
}

function selectFader(div) {
  if (selFader) selFader.classList.remove('sel')
  if (div) div.classList.add('sel')
  selFader = div
}

function nextFader() {
  if (!selFader) selectFader(faders[0])
  else selectFader(selFader.nextElementSibling)
}

function prevFader() {
  if (!selFader) selectFader(faders[faders.length-1])
  else selectFader(selFader.previousElementSibling)
}


document.body.onkeydown = e => {
  let prevent = true
  switch (e.code) {
    case 'ArrowDown':
      if (!e.repeat) nextCue()
      break;
    case 'ArrowUp':
      if (!e.repeat) prevCue()
      break;
    case 'Space':
      if (e.repeat) break;
      if (playing) {
        document.getElementById('go').onclick()
        nextCue()
      }
      document.getElementById('go').onclick()
      break;
      
    case 'KeyP':
      changeFader(selFader, -100)
      nextFader()
      changeFader(selFader, 100)
      break;
    case 'KeyI':
      changeFader(selFader, 100)
      break;
    case 'KeyO':
      changeFader(selFader, -100)
      break;
    case 'ArrowLeft':
      prevFader()
      break;
    case 'ArrowRight':
      nextFader()
      break;
    case 'Escape':
      selFader.classList.remove('sel')
      selFader = null
      break;
      
    case 'Digit1':
      changeFader(selFader, 1)
      break;
    case 'KeyQ':
      changeFader(selFader, -1)
      break;
    case 'Digit2':
      changeFader(selFader, .1)
      break;
    case 'KeyW':
      changeFader(selFader, -.1)
      break;
    case 'Digit3':
      changeFader(selFader, .02)
      break;
    case 'KeyE':
      changeFader(selFader, -.02)
      break;
      
    default:
      prevent = false
  }
  if (prevent) e.preventDefault()
}

document.body.onwheel = e => {
  if (selFader) {
    changeFader(selFader, -e.deltaY/2)
    e.preventDefault()
  }
}


function limit(val, max=100, min=0) {
  if (val < min) val = min
  else if (val > max) val = max
  return val
}

function formatTime(t) {
  return [
    Math.floor(t/60000),
    ':',
    ('0'+Math.floor((t%60000)/1000)).slice(-2),
    '.',
    ('00'+Math.round(t%1000)).slice(-3)
  ].join('')
}

let saveInter = null
function setCo(co) {
  if (co) {
    socket.emit('refresh')
    saveInter = setInterval(()=>socket.emit('save', 'autosave'), 60000)
  } else clearInterval(saveInter)
  document.getElementById('co').style.backgroundColor = co?"green":"red"
}

function populate(sel, opts) {
  sel.innerHTML = ''
  opts.forEach(v=>{
    let o = document.createElement('option')
    o.innerHTML = v
    sel.appendChild(o)
  })
}
