const fs = require('fs')
    , spawn = require('child_process').spawn
    , readline = require('readline')

let omx = spawn('omxplayer', ['./sounds/test_panoramique.aif', '-Is', '-l', '00:00:15'])


omx.stderr.once('data', data=>{
  console.log('err', data.toString(), new Date().getTime())
  setTimeout(function() {console.log('dring1', new Date().getTime())}, 1400)
  setTimeout(function() {console.log('dring2', new Date().getTime())}, 6270)
})



/*
  , rl = readline.createInterface({
    input: omx.stdout
  })

omx.stdout.pipe(process.stdout)
*/


/*
rl.on('line', l=>console.log('line', l))

omx.stdout.on('data', data=>console.log('out\n', data.toString()))

omx.on('close', code=>console.log('exit with ', code))
*/