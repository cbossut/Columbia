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

const funcs =
      {
        const: (p, val) => val
      , line: (p, start, end) => start + p*(end - start) // p = 0-1 => start -> end
      , sinus: (p, med, amp, n) => Math.sin(p*n*2*Math.PI)*amp+med // n periods in p = 0-1
      , loop: function(p, s) {return scenario(p*this.d, s)} // p = 0-1 => 0-d scenario content
      }

let cbs = []

module.exports.read = function(t) { // t in second
  let res = []
  for ( let ch of cbs ) {
    if ( !ch.scenario.length ) continue;
    let val = scenario(t, ch.scenario)
    for ( let c of ch.channels ) {
      res[c - 1] = val
    }
  }
  return res
}

module.exports.setModel = function(model) {
  cbs = model
}

module.exports.getModel = () => cbs

function scenario(t, s) { // t in second
  let i = 0
  while (s[i] && t > s[i].d) {
    t -= s[i].d
    i = (i+1) % s.length
  }
  return funcs[s[i].func].apply(s[i], [t/s[i].d].concat(s[i].args))
}

// TODO use it ? ability to replace each fixed param by a rand
function randBetween(min, max) {
  return min + Math.random()*(max-min)
}
