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

//TODO Remove all call to firstElement, lastElement, children[i] because a change in html breaks it all

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


document.getElementById('newFile').onclick = ()=>socket.emit('new')

let files = document.getElementById('files')
  , saveName = document.getElementById('fileName')

document.getElementById('load')
  .onclick = ()=>socket.emit('load', files.value)
document.getElementById('save')
  .onclick = ()=>{
    document.getElementById('co').style.backgroundColor = 'blue'
    socket.emit('save', saveName.value)
    socket.emit('refresh')
  }
socket.on('files', f=>{
  populate(files, f)
})
/*
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
*/
document.getElementById('patchShow').onclick = function() {
  let st = document.getElementById('patchP').style
  if (st.display == 'none') st.display = 'initial'
  else st.display = 'none'
}
document.getElementById('exit').onclick = ()=>socket.emit('exit')


let soundFiles = document.getElementById('soundFiles')
  , playBtn = document.getElementById('soundPlay')
  , soundTimes = {
      container: document.getElementById('soundContainer'),
      posSpan: document.getElementById('soundPos'),
      posBar: document.getElementById('soundBar'),
      durSpan: document.getElementById('soundDur'),
      minSpan: document.getElementById('soundMin'),
      maxSpan: document.getElementById('soundMax'),
      cursor: document.getElementById('soundCursor'),
      cursors: [],
      l: 0,
      h: 0,
      d: -1,
      p: -1,
      updateDraw: function(cursors = false) {
        let percent = limit(100*(this.pos - this.min)/(this.max - this.min))
        this.posBar.style.width = percent ? percent+'%' : '3px'
        if (cursors) this.cursors.forEach(v=>v.pos = v.pos)
      },
      get min() {return this.l},
      get max() {return this.h},
      get dur() {return this.d},
      get pos() {return this.p},
      set min(m) {
        m = limit(m, this.max)
        this.l = m
        this.minSpan.innerHTML = formatTime(m)
        this.updateDraw(true)
      },
      set max(m) {
        m = limit(m, this.dur, this.min)
        this.h = m
        this.maxSpan.innerHTML = formatTime(m)
        this.updateDraw(true)
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
        this.updateDraw()
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
    let precCursor = null
      , i = 0
    do {
      if (soundTimes.cursors[i].pos != -1) precCursor = soundTimes.cursors[i]
    } while (++i < soundTimes.cursors.length && soundTimes.cursors[i].pos <= soundTimes.pos)
    if (precCursor) selCue(precCursor.time.parentElement.parentElement, false)
  },
  onend: e=>{
    if (moveWhilePlaying) {
      socket.emit('playSound', soundTimes.pos)
      moveWhilePlaying = false
    }
  }
})

interact(soundTimes.minSpan).draggable({
  onmove: e=>soundTimes.min -= 1000*e.dy
})
interact(soundTimes.maxSpan).draggable({
  onmove: e=>soundTimes.max -= 1000*e.dy
})

interact('.cursor').draggable({
  allowFrom: '.cursorHandle',
  onmove: e=>{
    if (!e.dx) return;
    let tot = soundTimes.container.getBoundingClientRect().width
      , ratio = limit(Math.floor(e.currentTarget.offsetLeft+e.dx), tot) / tot
    e.currentTarget.pos = ratio*(soundTimes.max-soundTimes.min)+soundTimes.min
  },
  onend: e=>e.currentTarget.time.onchange()
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
  while(c && beforeMem(c.children[2].innerHTML)) c = c.nextElementSibling
  
  socket.emit(
    'addCue',
    mem.value,
    c ? parseInt(c.children[1].innerHTML)-2 : cl.children.length-1
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
  soundTimes.cursors.forEach(v=>v.remove())
  soundTimes.cursors = []
  content.forEach((v,i,a) => {
    let line = cue.cloneNode(true)
    line.removeAttribute('id')
    line.classList.remove('proto')
    let el = line.firstElementChild
    if (v.comment) el.children[0].value = v.comment
    el.children[0].onchange = function() {
      socket.emit('cueChange', {n:i, change:{comment:this.value}})
    }
    el = el.nextElementSibling
    el.innerHTML = i+1
    el = el.nextElementSibling
    el.innerHTML = v.name
    el = el.nextElementSibling
    el.children[0].onclick = function() {
      if (this.classList.contains('sel')) {
        socket.emit('update', i)
        this.classList.remove('sel')
      } else {
        this.classList.add('sel')
        setTimeout(()=>this.classList.remove('sel'), 5000)
      }
    }
    el = el.nextElementSibling
    let inp = el.children[0]
    inp.num = i
    inp.value = ''
    inp.onchange = inp.onkeyup = function() {
      this.parentElement.nextElementSibling.firstElementChild.value = this.value
      this.parentElement.nextElementSibling.nextElementSibling.firstElementChild.value = this.value
      socket.emit('cueChange', {n:this.num, change:{upTime:this.value, downTime:this.value}})
    }
    el = el.nextElementSibling
    inp = el.children[0]
    inp.num = i
    inp.value = v.upTime
    /*WIP
    inp.onclick = function() {console.log('click')
      this.lastvalue = this.value
      this.value = ''
    }
    inp.onfocusout = function() {console.log('focusout')
      if (!this.value) this.value = this.lastvalue
    }
    */
    inp.onchange = inp.onkeyup = function() {
      this.parentElement.previousElementSibling.firstElementChild.value = ''
      socket.emit('cueChange', {n:this.num, change:{upTime:this.value}})
    }
    el = el.nextElementSibling
    inp = el.children[0]
    inp.num = i
    inp.value = v.downTime
    /*WIP
    inp.onclick = function() {
      this.lastvalue = this.value
      this.value = ''
    }
    inp.onfocusout = function() {
      if (!this.value) this.value = this.lastvalue
    }
    */
    inp.onchange = inp.onkeyup = function() {
      this.parentElement.previousElementSibling.previousElementSibling.firstElementChild.value = ''
      socket.emit('cueChange', {n:this.num, change:{downTime:this.value}})
    }
    el = el.nextElementSibling
    let btn = el.children[1]
      , time = el.children[0]
    line.timeElement = time
    time.cursor = soundTimes.cursor.cloneNode(true)
    soundTimes.cursors.push(time.cursor)
    time.cursor.removeAttribute('id')
    time.cursor.classList.remove('proto')
    time.cursor.children[0].innerHTML = v.name
    time.cursor.time = time
    Object.defineProperty(time.cursor, 'pos', {
      enumerable: true,
      configurable: true,
      get: function() {return this.p},
      set: function(p) {
        this.p = p
        this.time.valueAsNumber = p
        if (p < soundTimes.min || p > soundTimes.max) {
          this.style.display = 'none'
        } else {
          this.style.display = 'initial'
          let percent = limit(100*(p - soundTimes.min)/(soundTimes.max - soundTimes.min))
          this.style.left = percent+'%'
        }
      }
    })
    if (v.date == -1) {
      time.style.display = 'none'
      time.cursor.style.display = 'none'
      time.cursor.pos = v.date
      btn.onclick = function() {
        socket.emit('cueChange', {n:i, change:{date: soundTimes.pos}})
        time.style.display = 'initial'
        btn.style.display = 'none'
        time.cursor.pos = soundTimes.pos
      }
    } else {
      btn.style.display = 'none'
      time.cursor.pos = v.date
    }
    time.onchange = function() {
      time.cursor.pos = this.valueAsNumber
      socket.emit('cueChange', {n:i, change:{date: this.valueAsNumber}})
    }
    soundTimes.container.appendChild(time.cursor)
    cl.appendChild(line)
  })
})

interact('.cueTR')
.pointerEvents({ignoreFrom: '.nosel'})
.on('tap', e=>{
  if (e.ctrlKey) {
    addSelCue(e.currentTarget)
  } else {
    selCue(e.currentTarget)
  }
})

document.getElementById('delCue').onclick = ()=>{
  socket.emit('delete', selCueIndex)
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


function selCue(trNode, setPos = true) {
  if (!trNode) {
    unselCue()
    return;
  }
  
  document.querySelectorAll('.cueTR.sel')
    .forEach(v=>v.classList.remove('sel'))
  trNode.classList.add('sel')
  selCueIndex = parseInt(trNode.children[1].innerHTML) - 1
  
  socket.emit('apply', selCueIndex)
  
  if (setPos && soundTimes.cursors[selCueIndex].pos != -1) {
    soundTimes.pos = soundTimes.cursors[selCueIndex].pos
  }
  
  document.querySelectorAll('.cueAct')
    .forEach(v=>v.disabled = false)
}

function addSelCue(trNode) {
  trNode.classList.add('sel')
  selCueIndex = -1
  document.querySelectorAll('.cueAct').forEach(v=>v.disabled=true)
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

function changeSelTimes(d) {
  document.querySelectorAll('.cueTR.sel').forEach(v=>{
    v.timeElement.valueAsNumber += d
    v.timeElement.onchange()
  })
}


let faders = []
  , ledList = []
  , fader = document.getElementById('fader')

socket.on('patch', o => {
  let patch = o.patch
    , pcas = o.pcas
    , panel = document.getElementById('orgueP')
    , spanList = document.getElementById('listLeds')
    , selLeds = document.getElementById('selLeds')
    , expInput = document.getElementById('exposantLeds')
  panel.innerHTML = ''
  faders = []
  ledList = []
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
    
    //CRAPPY
    if (v.exp) {
      ledList.push(i+1)
      expInput.value = v.exp
    }
  })
  
  spanList.innerHTML = ledList
  populate(selLeds, patch.map((v,i)=>i+1))
  document.getElementById('addLed').onclick = ()=>{
    let ledVue = parseInt(selLeds.value)
    if (ledList.indexOf(ledVue) != -1) return;
    ledList.push(ledVue)
    spanList.innerHTML = ledList
    socket.emit('patchChange', {n:ledVue - 1,new:{exp:expInput.value}})
  }
  document.getElementById('rmLed').onclick = ()=>{
    let ledVue = parseInt(selLeds.value)
      , ind = ledList.indexOf(ledVue)
    if (ind == -1) return;
    ledList.splice(ind,1)
    spanList.innerHTML = ledList
    socket.emit('patchChange', {n:ledVue - 1,new:{exp:null}})
  }
  expInput.onchange = function() {
    ledList.forEach(v=>socket.emit('patchChange', {n:v-1,new:{exp:this.value}}))
  }
})

interact('.fader').draggable({
  onmove: e=>changeFader(e.currentTarget, - parseInt(e.dy)/2)
})
.pointerEvents()
.on('tap', e=>selectFader(e.currentTarget))

interact('#selAllFader')
.on('tap', selAllFaderOn)
.draggable({
  onstart: selAllFaderOn,
  onmove: e=>changeSelFaders(- parseInt(e.dy)/2)
})

socket.on('orgueState', s => {
  faders.forEach((v,i,a)=>v.value = Math.ceil(100*s[i]/factor)/100)
})

function changeFader(f, d) {
  if (!d || !f) return;
  f.value = Math.ceil(100*Math.round(factor*limit(f.value + d))/factor)/100
  socket.emit('orgue', {led:f.num, val:f.value*factor})
}

function changeSelFaders(d) {
  if (!d) return;
  document.querySelectorAll('.fader.sel').forEach(v=>changeFader(v, d))
}

function selectFader(div) {
  unselectFader()
  if (div) div.classList.add('sel')
}

function unselectFader() {
  document.querySelectorAll('.fader.sel').forEach(v=>v.classList.remove('sel'))
}

function nextFader() {
  let seled = document.querySelector('.fader.sel')
  if (!seled) selectFader(faders[0])
  else {
    let prox = seled.nextElementSibling
    while(prox && prox.nodeName == 'BR'){
      prox = prox.nextElementSibling
    }
    selectFader(prox)
  }
}

function prevFader() {
  let seled = document.querySelector('.fader.sel')
  if (!seled) selectFader(faders[faders.length-1])
  else {
    let prox = seled.previousElementSibling
    while(prox && prox.nodeName == 'BR'){
      prox = prox.previousElementSibling
    }
    selectFader(prox)
  }
}

function selAllFaderOn() {
  unselectFader()
  faders.forEach(v=>{if (v.value) v.classList.add('sel')})
}


document.body.onkeydown = e => {
  if (e.target.nodeName == 'INPUT') return;
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
      
    case 'Digit5':
      changeSelTimes(1000)
      break;
    case 'KeyT':
      changeSelTimes(-1000)
      break;
    case 'Digit6':
      changeSelTimes(1)
      break;
    case 'KeyY':
      changeSelTimes(-1)
      break;
      
    case 'KeyP':
      changeSelFaders(-100)
      nextFader()
      changeSelFaders(100)
      break;
    case 'KeyI':
      changeSelFaders(100)
      break;
    case 'KeyO':
      changeSelFaders(-100)
      break;
    case 'ArrowLeft':
      prevFader()
      break;
    case 'ArrowRight':
      nextFader()
      break;
    case 'Escape':
      unselectFader()
      break;
      
    case 'Digit1':
      changeSelFaders(1)
      break;
    case 'KeyQ':
      changeSelFaders(-1)
      break;
    case 'Digit2':
      changeSelFaders(.1)
      break;
    case 'KeyW':
      changeSelFaders(-.1)
      break;
    case 'Digit3':
      changeSelFaders(.02)
      break;
    case 'KeyE':
      changeSelFaders(-.02)
      break;
      
    default:
      prevent = false
  }
  if (prevent) e.preventDefault()
}

document.body.onwheel = e => {
  if (document.querySelector('.fader.sel')) {
    changeSelFaders(-e.deltaY/2)
    e.preventDefault()
  }
}


socket.on('endSave', ()=>document.getElementById('co').style.backgroundColor = 'green')


function limit(val, max=100, min=0) {
  if (val < min) val = min
  else if (val > max) val = max
  return val
}

function formatTime(t, tab = false) {
  let tt = [
    Math.floor(t/60000),
    ':',
    ('0'+Math.floor((t%60000)/1000)).slice(-2),
    '.',
    ('00'+Math.round(t%1000)).slice(-3)
  ]
  return tab ? tt : tt.join('')
}

let saveInter = []
function setCo(co) {
  saveInter.forEach(clearInterval)
  saveInter = []
  if (co) {
    socket.emit('refresh')
    saveInter.push(setInterval(()=>{
      document.getElementById('co').style.backgroundColor = 'blue'
      socket.emit('save', 'autosave')
    }, 60000))
    saveInter.push(setInterval(()=>{
      let d = new Date()
        , name = [
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
          d.getHours(),
          d.getMinutes()
        ].join('-')
      document.getElementById('co').style.backgroundColor = 'blue'
      socket.emit('save', name)
    }, 300000))
  }
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
