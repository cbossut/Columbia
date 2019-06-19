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

/* PATCH cuisine
1:niche
2:cuisine
3:plafond centre
4:plafond pano
5:table in
6:presse
7:table out
8:piou
9:plafond loge
10:diapo
*/

process.chdir(__dirname)

const fs = require('fs')
    , funcs =
      {
        const: (p, val) => val
      , line: (p, start, end) => start + p*(end - start) // p = 0-1 => start -> end
      , sinus: (p, med, amp, n) => Math.sin(p*n*2*Math.PI)*amp+med // n periods in p = 0-1
      , loop: function(p, s) {return scenario(p*this.d, s)} // p = 0-1 => 0-d scenario content
      }

let chs
if ( fs.existsSync('./cuisine.json') )
  chs = JSON.parse(fs.readFileSync('./cuisine.json')) // TODO shouldn't load by default, nor hardCode path, see load
else chs = []

module.exports.update = function(t) {
  let res = []
  for (let i in chs) {
    for (let j in chs[i].channels) {
      res[chs[i].channels[j] - 1] = Math.round(scenario(t, chs[i].scenario)*2.55) // TODO same as mise DMX
    }
  }
  return res
}

module.exports.load = function(path) {
  chs = JSON.parse(fs.readFileSync(path))
}

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
