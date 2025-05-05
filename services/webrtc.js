// export class WebRTCService {
//     constructor(socket) {
//       this.socket = socket
//       this.peerConnection = new RTCPeerConnection({
//         iceServers: [
//           { urls: 'stun:stun.l.google.com:19302' },
//           { urls: 'stun:global.stun.twilio.com:3478' }
//         ]
//       })
//       this.localStream = null
//       this.remoteStream = null
  
//       // Handle ICE candidates
//       this.peerConnection.onicecandidate = (event) => {
//         if (event.candidate) {
//           this.socket.emit('ice-candidate', event.candidate)
//         }
//       }
  
//       // Handle incoming tracks
//       this.peerConnection.ontrack = (event) => {
//         this.remoteStream = event.streams[0]
//       }
//     }
  
//     async startCall(isVideo) {
//       try {
//         this.localStream = await navigator.mediaDevices.getUserMedia({
//           audio: true,
//           video: isVideo
//         })
  
//         this.localStream.getTracks().forEach(track => {
//           this.peerConnection.addTrack(track, this.localStream)
//         })
  
//         const offer = await this.peerConnection.createOffer()
//         await this.peerConnection.setLocalDescription(offer)
  
//         return { localStream: this.localStream, offer }
//       } catch (error) {
//         console.error('Error starting call:', error)
//         throw error
//       }
//     }
  
//     async handleAnswer(answer) {
//       try {
//         await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
//       } catch (error) {
//         console.error('Error handling answer:', error)
//         throw error
//       }
//     }
  
//     async handleIceCandidate(candidate) {
//       try {
//         await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
//       } catch (error) {
//         console.error('Error handling ICE candidate:', error)
//         throw error
//       }
//     }
  
//     cleanup() {
//       if (this.localStream) {
//         this.localStream.getTracks().forEach(track => track.stop())
//       }
//       if (this.peerConnection) {
//         this.peerConnection.close()
//       }
//     }
//   }
  
  







export class WebRTCService {
  constructor(socket) {
    this.socket = socket
    this.peerConnection = null
    this.localStream = null
    this.remoteStream = null
    this.onRemoteStreamChange = null

    // Set up socket event listeners for WebRTC signaling
    this.setupSocketListeners()
  }

  setupSocketListeners() {
    // Listen for ICE candidates from the remote peer
    this.socket.on("ice-candidate", async ({ candidate }) => {
      try {
        if (this.peerConnection) {
          await this.peerConnection.addIceCandidate(candidate)
        }
      } catch (error) {
        console.error("Error adding received ice candidate", error)
      }
    })
  }

  async startCall(isVideo = false) {
    try {
      // Create a new RTCPeerConnection
      this.createPeerConnection()

      // Get user media (audio and optionally video)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      })

      // Add tracks from local stream to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      // Create an offer
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      return { localStream: this.localStream, offer }
    } catch (error) {
      console.error("Error starting call:", error)
      this.cleanup()
      throw error
    }
  }

  async acceptCall(offer, isVideo = false) {
    try {
      // Create a new RTCPeerConnection
      this.createPeerConnection()

      // Get user media (audio and optionally video)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      })

      // Add tracks from local stream to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      // Set remote description (the offer)
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

      // Create an answer
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      return { localStream: this.localStream, answer }
    } catch (error) {
      console.error("Error accepting call:", error)
      this.cleanup()
      throw error
    }
  }

  async handleAnswer(answer) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      }
    } catch (error) {
      console.error("Error handling answer:", error)
    }
  }

  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
    }
  }

  createPeerConnection() {
    // Configure ICE servers (STUN/TURN)
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        // Add TURN servers for production
      ],
    }

    this.peerConnection = new RTCPeerConnection(configuration)

    // Handle ICE candidate events
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("ice-candidate", {
          candidate: event.candidate,
        })
      }
    }

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", this.peerConnection.connectionState)
    }

    // Handle receiving remote tracks
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0]

      // Notify any listeners about the remote stream
      if (this.onRemoteStreamChange) {
        this.onRemoteStreamChange(this.remoteStream)
      }
    }

    return this.peerConnection
  }

  cleanup() {
    // Stop all tracks in the local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }

    // Close the peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    this.remoteStream = null
  }
}
