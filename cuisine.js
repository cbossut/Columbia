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

process.chdir(__dirname)

const /*DMX = require('./DMX.js')
    , Gpio = require('onoff').Gpio
    , */fs = require('fs')
    , params = JSON.parse(fs.readFileSync('./cuisine.json'))
    , FPS = 40
    , funcs =
      {
        const: (p, val) => val
      , line: (p, start, end) => start + p*(end - start)
      , sinus: (p, med, amp, n) => Math.sin(p*n*2*Math.PI)*amp+med
      , loop: function(p, s) {return scenario(p%1*this.d, s)}
      }

module.exports.update = function(t) {
  let res = []
  for (let i in params) {
    res[params[i].channel] = scenario(t, params[i].scenario)
  }
  return res
}

module.exports.params = params

function scenario(t, s) {
  let i = 0
  while (s[i] && (s[i].func == 'loop' ? t > (s[i].d*s[i].n) : t > s[i].d)) {
    t -= s[i].d//'loop' ? t > (s[i].d*s[i].n) : t > s[i].d
    i = (i+1) % s.length
  }
  //if (s[i].func == 'loop') s[i].m = 0
  return funcs[s[i].func].apply(s[i], [t/s[i].d].concat(s[i].args))
}

function randBetween(min, max) {
  return min + Math.random()*(max-min)
}