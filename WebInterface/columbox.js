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

const restrictToParent = interact.modifiers.restrict({
  restriction: 'parent'
})

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

function boxulate(boxDiv) {

  boxDiv.updateDuration = d => {
    boxDiv.style.width = 100 * d / soundDur + '%'
    boxDiv.model.d = d
  }

  boxDiv.updateFunc = (func, args) => {
    for ( let div of boxDiv.getElementsByTagName('div') ) boxDiv.removeChild(div)

    switch ( func ) {
      case 'const':
        let line = newDiv('horizontalLine')
        line.updateValue = p => {
          line.style.bottom = p + '%'
          boxDiv.model.args[0] = p
        }
        line.updateValue(args[0] || 0)
        boxDiv.appendChild(line)
        break;

      case 'line':
        let diag = newDiv('horizontalLine')
        diag.style.bottom = ((args[0] || 0) + (args[1] || 100)) / 2 + '%'
        boxDiv.appendChild(diag)
        diag.style.transform = /*window.getComputedStyle(diag) +*/ 'rotate(-45deg)'
        break;

      case 'sinus':
        let min = newDiv('horizontalLine')
          , max = newDiv('horizontalLine')
        min.style.bottom = (args[0] - args[1] + '%') || '0%'
        max.style.bottom = (args[0] + args[1] + '%') || '100%'
        min.updateValue = p => {
          let maxP = (args[0] + args[1]) || 100
          min.style.bottom = p + '%'
          boxDiv.model.args[0] = (p + maxP) / 2
          boxDiv.model.args[1] = (maxP - p) / 2
        }
        max.updateValue = p => {
          let minP = (args[0] - args[1]) || 0
          max.style.bottom = p + '%'
          boxDiv.model.args[0] = (p + minP) / 2
          boxDiv.model.args[1] = (p - minP) / 2
        }
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

function newDiv(cl) {
  let d = document.createElement('div')
  if ( cl ) d.classList.add(cl)
  return d
}

function transformFromEvent(e) {
  let totDx = (e.client.x - e.clientX0)
    , totDy = (e.client.y - e.clientY0)
  e.target.style.transform = 'translate(' + totDx + ',' + totDy + 'px)'
}
