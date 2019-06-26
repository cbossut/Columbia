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

let CBlinesDiv = document.getElementById('CBlines')

for ( let i in CBlines ) {
  let cbl = CBlines[i]
    , cblDiv = newDiv('CBL') // ColumBoxLine
    , chsDiv = newDiv('CHS') // CblHeadingSection
    , boxesDiv = newDiv('boxes')

  chsDiv.textContent = cbl.channels
  cblDiv.appendChild(chsDiv)

  boxulate(boxesDiv, cbl.scenario)
  cblDiv.appendChild(boxesDiv)

  CBlinesDiv.appendChild(cblDiv)
}

function boxulate(container, scenario) {
  for ( let i in scenario ) {
    let box = scenario[i]
      , boxDiv = newDiv('columbox')

    boxDiv.style.width = Math.floor(200000 * box.d / soundDur) / 2000 + '%'
    boxDiv.textContent = box.func + ' ' + box.args

    switch ( box.func ) {
      case 'const':
        let line = newDiv('horizontalLine')
        line.updateValue = p => {
          box.args[0] = p
          line.style.bottom = p + '%'
        }
        line.updateValue(box.args[0])
        boxDiv.appendChild(line)
        break;

      case 'line':
        let diag = newDiv('horizontalLine')
        diag.style.bottom = (box.args[0] + box.args[1]) / 2 + '%'
        boxDiv.appendChild(diag)
        diag.style.transform = /*window.getComputedStyle(diag) +*/ 'rotate(-45deg)'
        break;

      case 'sinus':
        let min = newDiv('horizontalLine')
          , max = newDiv('horizontalLine')
        min.style.bottom = box.args[0] - box.args[1] + '%'
        max.style.bottom = box.args[0] + box.args[1] + '%'
        min.updateValue = p => {
          let maxP = box.args[0] + box.args[1]
          box.args[0] = (p + maxP) / 2
          box.args[1] = (maxP - p) / 2
          min.style.bottom = p + '%'
        }
        max.updateValue = p => {
          let minP = box.args[0] - box.args[1]
          box.args[0] = (p + minP) / 2
          box.args[1] = (p - minP) / 2
          max.style.bottom = p + '%'
        }
        boxDiv.appendChild(min)
        boxDiv.appendChild(max)
        break;
    }

    container.appendChild(boxDiv)
  }
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
