const setupCallHandlers = (io, socket) => {
    socket.on('call-user', async ({ to, offer, isVideo }) => {
      io.to(to).emit('incoming-call', {
        from: socket.id,
        offer,
        isVideo
      })
    })
  
    socket.on('call-answer', ({ to, answer }) => {
      io.to(to).emit('call-answer', { answer })
    })
  
    socket.on('ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('ice-candidate', { candidate })
    })
  
    socket.on('end-call', ({ to }) => {
      io.to(to).emit('call-ended')
    })
  }
  
  module.exports = { setupCallHandlers }
  
  