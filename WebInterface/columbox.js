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

let boxViewModels = []
CBlines.map(cbl => { // TODO add fsRead to fill CBLines
  let cblDiv = newDiv('CBL') // ColumBoxLine
    , chsDiv = newDiv('CHS') // CblHeadingSection
    , boxesDiv = newDiv('boxes')
    , cblVM = []

  chsDiv.textContent = cbl.channels
  cblDiv.appendChild(chsDiv)

  cbl.scenario.map(box => {
    let boxDiv = newDiv('columbox')
    boxDiv.model = box
    boxulate(boxDiv)
    boxesDiv.appendChild(boxDiv)
    cblVM.push(boxDiv)
  })
  cblDiv.appendChild(boxesDiv)

  CBlinesDiv.appendChild(cblDiv)
  boxViewModels.push(cblVM)
})

let selBoxCoord = [0,0]
updateEditPanel(selBoxCoord)

function updateEditPanel(boxCoord) {
  document.getElementById('boxID').innerHTML = 'Line ' + boxCoord[0] + ' Box ' + boxCoord[1]

  const boxDiv = boxViewModels[boxCoord[0]][boxCoord[1]]
      , dur = document.getElementById('boxDuration')
      , func = document.getElementById('boxFunc')
      , args = []
  let i = 0, arg
  while ( arg = document.getElementById('boxArg' + i++) ) args.push(arg)

  dur.valueAsNumber = boxDiv.model.d * 1000
  dur.onchange = () => {
    boxDiv.updateDuration(dur.valueAsNumber / 1000)
  }

  func.selectedIndex = Object.keys(funcs).indexOf(boxDiv.model.func)
  func.onchange = () => {
    boxDiv.updateFunc(Object.keys(funcs)[func.selectedIndex])
  }

  for ( let i in args ) {
    let argName = funcs[boxDiv.model.func].args[i]
      , argSpan = args[i]
      , argInput = argSpan.querySelector('input')
      , argTextNode = argInput.previousSibling
    if ( !argName ) argSpan.style.display = 'none'
    else {
      argSpan.style.display = null

      argTextNode.textContent = argName + ' : '

      argInput.valueAsNumber = boxDiv.model.args[i]
      argInput.onchange = () => {
        boxDiv.updateArg(i, argInput.valueAsNumber)
      }
    }
  }
}

function boxulate(boxDiv) {

  boxDiv.updateDuration = d => {
    boxDiv.model.d = d
    boxDiv.style.width = 100 * d / soundDur + '%'
  }

  boxDiv.updateArg = (n, v) => {
    boxDiv.model.args[n] = v
    boxDiv.updateCurve()
  }

  boxDiv.updateAllArgs = args => {
    for ( let i in args ) boxDiv.model.args[i] = args[i]
    boxDiv.updateCurve()
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
