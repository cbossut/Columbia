let d = document.createElement('div')
d.className = 'fader'
d.innerHTML = 0
d.val = 0
document.body.appendChild(d)

interact('.fader').draggable({
  onmove: e=>{d.val=limit(d.val-parseInt(e.dy));d.innerHTML=d.val}
})

function limit(val, min=0, max=100) {
  if (val < min) val = min
  else if (val > max) val = max
  return val
}