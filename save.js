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


const fs = require('fs')

module.exports = {

  savePath: './data/columbox.json',

  save: (model, path, space = 2) => fs.writeFileSync(path, JSON.stringify(model, null, space)),

  load: path => {
    if ( fs.existsSync(path) ) return JSON.parse(fs.readFileSync(path))
    else console.error("No such file : " + path)
  }

}

// Expose directly to client
module.exports.expose = {
  save: model => module.exports.save(model, module.exports.savePath)
}
