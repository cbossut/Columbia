let socket = io(window.location.href)
socket.on('connect', ()=>setCo(true))
socket.on('reconnect', ()=>setCo(true))
socket.on('disconnect', ()=>setCo(false))








function setCo(co) {
  document.getElementById('co').style.backgroundColor = co?"green":"red"
}
