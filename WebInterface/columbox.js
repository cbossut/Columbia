/*
Copyright ou © ou Copr. Clément Bossut, (2018)
<bossut.clement@gmail.com>

Ce logiciel est un programme informatique servant à écrire et jouer une conduite de paramètres synchronisée sur du son.

Ce logiciel est régi par la licence CeCILL soumise au droit français et
respectant les principes de diffusion des logiciels libres. Vous pouvez
utiliser, modifier et/ou redistribuer ce programme sous les conditions
de la licence CeCILL telle que diffusée par le CEA, le CNRS et l'INRIA
sur le site "http://www.cecill.info".
*/

const soundDur = 140

const funcs = {
  const: {name: 'Constante',   args: ['Valeur']},
  line:  {name: 'Transition',  args: ['Début', 'Fin']},
  sinus: {name: 'Oscillation', args: ['Médiane', 'Amplitude', 'Répétitions']}
}

const restrictToParent = interact.modifiers.restrict({
  restriction: 'parent'
})

populate('.funcs', Object.keys(funcs).map(v => funcs[v].name))

const CBlinesDiv = document.getElementById('CBlines')
    , firstPlusBtn = document.querySelector('.plusBtn')
    , plusBtnProto = firstPlusBtn.cloneNode(true)

firstPlusBtn.style.position = 'initial'
firstPlusBtn.style.display = 'block'
firstPlusBtn.onclick = () => {
  addLine(JSON.parse(JSON.stringify(defaultLine)), 0)
}

const defaultLine = {channels: [0], scenario: []}
    , defaultBox = {d: 5, func: 'const', args: [10]}
    , CBlines = []

let boxViewModels = []

function load(model) {
  CBlines = []
  model.map((cbl, i) => addLine(cbl, i, false))
}

function addLine(model, n, toModel = true) {
  let cblDiv = newDiv('CBL') // ColumBoxLine
    , chsDiv = newDiv('CHS') // CblHeadingSection
    , plusBtn = plusBtnProto.cloneNode(true)
    , plusBoxBtn = plusBtnProto.cloneNode(true)
    , boxesDiv = newDiv('boxes')

  chsDiv.textContent = model.channels
  plusBtn.style.left = '0'
  plusBtn.onclick = () => {
    addLine(JSON.parse(JSON.stringify(defaultLine)), cblDiv.lineIndex+1)
  }
  plusBoxBtn.onclick = () => {
    addBox(JSON.parse(JSON.stringify(defaultBox)), cblDiv.lineIndex, 0)
  }
  chsDiv.appendChild(plusBtn)
  chsDiv.appendChild(plusBoxBtn)
  cblDiv.appendChild(chsDiv)
  cblDiv.appendChild(boxesDiv)

  cblDiv.lineIndex = n

  if ( n == boxViewModels.length ) {
    if ( toModel ) CBlines.push(model)
    CBlinesDiv.appendChild(cblDiv)
    boxViewModels.push([])
  } else {
    if ( toModel ) CBlines.splice(n, 0, model)
    CBlinesDiv.insertBefore(cblDiv, CBlinesDiv.children[n])
    boxViewModels.splice(n, 0, [])

    let col = CBlinesDiv.children
    for (let i = n + 1 ; i < col.length ; i++ ) col.item(i).lineIndex++
  }

  model.scenario.map((box, j) => addBox(box, cbl.lineIndex, j, false))
}

function addBox(model, nLine, n, toModel = true) {
  let boxDiv = newDiv('columbox')
    , plusBtn = plusBtnProto.cloneNode(true)
    , lineDiv = CBlinesDiv.children[nLine]
    , boxesDiv = lineDiv.querySelector('.boxes')
    , lineVM = boxViewModels[nLine]

  boxDiv.model = model
  boxulate(boxDiv)
  plusBtn.onclick = () => {
    addBox(JSON.parse(JSON.stringify(defaultBox)), lineDiv.lineIndex, boxDiv.boxIndex+1)
  }
  boxDiv.appendChild(plusBtn)

  boxDiv.boxIndex = n

  if ( n == lineVM.length ) {
    if ( toModel ) CBlines[nLine].scenario.push(model)
    boxesDiv.appendChild(boxDiv)
    lineVM.push(boxDiv)
  } else {
    if ( toModel ) CBlines[nLine].scenario.splice(n, 0, model)
    boxesDiv.insertBefore(boxDiv, boxesDiv.children[n])
    lineVM.splice(n, 0, boxDiv)

    for ( let i = n + 1 ; i < lineVM.length ; i++ ) lineVM[i].boxIndex++
  }
}

let selBoxDiv
updateEditPanel()

function updateEditPanel() {
  if ( !selBoxDiv ) {
    document.getElementById('boxEdit').style.display = 'none'
    return;
  }
  document.getElementById('boxEdit').style.display = null

//  document.getElementById('boxID').innerHTML = 'Line ' + selBoxDiv.parentNode.parentNode.lineIndex + ' Box ' + selBoxDiv.boxIndex

  const dur = document.getElementById('boxDuration')
      , func = document.getElementById('boxFunc')
      , args = []
  let i = 0, arg
  while ( arg = document.getElementById('boxArg' + i++) ) args.push(arg)

  dur.valueAsNumber = selBoxDiv.model.d * 1000
  dur.onchange = () => {
    selBoxDiv.updateDuration(dur.valueAsNumber / 1000)
  }

  func.selectedIndex = Object.keys(funcs).indexOf(selBoxDiv.model.func)
  func.onchange = () => {
    selBoxDiv.updateFunc(Object.keys(funcs)[func.selectedIndex])
  }

  for ( let i in args ) {
    let argName = funcs[selBoxDiv.model.func].args[i]
      , argSpan = args[i]
      , argInput = argSpan.querySelector('input')
      , argTextNode = argInput.previousSibling
    if ( !argName ) argSpan.style.display = 'none'
    else {
      argSpan.style.display = null

      argTextNode.textContent = argName + ' : '

      argInput.valueAsNumber = selBoxDiv.model.args[i]
      argInput.onchange = () => {
        selBoxDiv.updateArg(i, argInput.valueAsNumber)
      }
    }
  }
}

function boxulate(boxDiv) {

  boxDiv.onclick = e => {
    if ( e.target != boxDiv ) return;
    for ( let sel of document.querySelectorAll('.seled') ) sel.classList.remove('seled')
    boxDiv.classList.add('seled')
    selBoxDiv = boxDiv
    updateEditPanel()
  }

  boxDiv.updateDuration = d => {
    boxDiv.model.d = d
    boxDiv.style.width = 100 * d / soundDur + '%'
    if ( boxDiv.classList.contains('seled') ) updateEditPanel()
  }

  boxDiv.updateArg = (n, v) => {
    boxDiv.model.args[n] = v
    boxDiv.updateCurve()
    if ( boxDiv.classList.contains('seled') ) updateEditPanel()
  }

  boxDiv.updateAllArgs = args => {
    for ( let i in args ) boxDiv.model.args[i] = args[i]
    boxDiv.updateCurve()
    if ( boxDiv.classList.contains('seled') ) updateEditPanel()
  }

  boxDiv.updateFunc = (func, args = []) => {
    boxDiv.model.func = func

    let toRm = []
    for ( let div of boxDiv.getElementsByTagName('div') ) toRm.push(div)
    for ( let div of toRm ) boxDiv.removeChild(div) // Rm from static list, not live htmlColl

    switch ( func ) {
      case 'const':
        let line = newDiv('horizontalLine')
        line.updateValue = p => boxDiv.updateArg(0, p)

        boxDiv.updateCurve = () => {
          line.style.bottom = boxDiv.model.args[0] + '%'
        }

        boxDiv.updateArg(0, args[0] || 0)
        boxDiv.appendChild(line)
        break;

      case 'line':
        let diag = newDiv('horizontalLine')
        diag.style.transform = /*window.getComputedStyle(diag) +*/ 'rotate(-45deg)'

        boxDiv.updateCurve = () => {
          diag.style.bottom = (boxDiv.model.args[0] + boxDiv.model.args[1]) / 2 + '%'
        }

        if ( Number.isNaN(+args[0]) ) args[0] = 0
        if ( Number.isNaN(+args[1]) ) args[1] = 100
        boxDiv.updateAllArgs(args)
        boxDiv.appendChild(diag)
        break;

      case 'sinus':
        let min = newDiv('horizontalLine')
          , max = newDiv('horizontalLine')
        min.updateValue = boxDiv.updateMin = p => {
          let maxP = boxDiv.model.args[0] + boxDiv.model.args[1]
          boxDiv.model.args[0] = (p + maxP) / 2
          boxDiv.model.args[1] = (maxP - p) / 2
          min.style.bottom = p + '%'
        }
        max.updateValue = boxDiv.updateMax = p => {
          let minP = boxDiv.model.args[0] - boxDiv.model.args[1]
          boxDiv.model.args[0] = (p + minP) / 2
          boxDiv.model.args[1] = (p - minP) / 2
          max.style.bottom = p + '%'
        }

        boxDiv.updateCurve = () => {
          min.style.bottom = boxDiv.model.args[0] - boxDiv.model.args[1] + '%'
          max.style.bottom = boxDiv.model.args[0] + boxDiv.model.args[1] + '%'
        }

        if ( Number.isNaN(+args[0]) ) args[0] = 50
        if ( Number.isNaN(+args[1]) ) args[1] = 50
        if ( Number.isNaN(+args[2]) ) args[2] = 1
        boxDiv.updateAllArgs(args)
        boxDiv.appendChild(min)
        boxDiv.appendChild(max)
        break;
    }
  }

  boxDiv.updateAll = box => {
    boxDiv.textContent = boxDiv.model.func + ' ' + boxDiv.model.args
    boxDiv.updateDuration(box.d)
    boxDiv.updateFunc(box.func, box.args)
  }

  boxDiv.updateAll(boxDiv.model)
}

interact('.horizontalLine').draggable({
  lockAxis: 'y',
  modifiers: [restrictToParent],
  onmove: e => {
    if ( e.dy ) transformFromEvent(e)
  },
  onend: e => {
    let rect = e.target.parentNode.getBoundingClientRect()
    e.target.style.transform = 'none'
    e.target.updateValue(100 * (rect.bottom - e.client.y) / rect.height)
  }
})

// TODO misc utility file (module ?)

function newDiv(cl) {
  let d = document.createElement('div')
  if ( cl ) d.classList.add(cl)
  return d
}

function populate(selector, opts) {
  document.querySelectorAll(selector).forEach(el => {
    el.innerHTML = ''
    opts.forEach(v => {
      let o = document.createElement('option')
      o.innerHTML = v
      el.appendChild(o)
    })
  })
}

function transformFromEvent(e) {
  let totDx = (e.client.x - e.clientX0)
    , totDy = (e.client.y - e.clientY0)
  e.target.style.transform = 'translate(' + totDx + ',' + totDy + 'px)'
}
