var fs = require('fs');
var wav = require('wav');
var Speaker = require('audio-speaker/stream');

var file = fs.createReadStream('sounds/pano16.wav');
var reader = new wav.Reader();

module.exports = {
  f: file,
  w: reader
}

// the "format" event gets emitted at the end of the WAVE header
reader.on('format', function (format) {
  console.log('Ready ',format)
  
  module.exports.s = new Speaker(format)

  // the WAVE header is stripped from the output of the reader
  reader.pipe(module.exports.s);
});

// pipe the WAVE file to the Reader instance
file.pipe(reader);