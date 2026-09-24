import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt"

class ZegoCloudService {
  constructor() {
    this.appID = null
    this.serverSecret = null
    this.initialized = false
  }

  init(appID, serverSecret) {
    if (!appID || !serverSecret) {
      console.error("ZegoCloud initialization failed: Missing appID or serverSecret")
      return false
    }

    this.appID = appID
    this.serverSecret = serverSecret
    this.initialized = true
    return true
  }

  // Generate a token for authentication
  generateToken(userID, userName, roomID, role = 1) {
    if (!this.initialized) {
      console.error("ZegoCloud not initialized")
      return null
    }

    return ZegoUIKitPrebuilt.generateKitTokenForTest(this.appID, this.serverSecret, roomID, userID, userName, role)
  }

  // Create a voice call instance
  async createVoiceCall(element, token, roomID, onCallEnd) {
    if (!this.initialized) {
      console.error("ZegoCloud not initialized")
      return null
    }

    const zp = ZegoUIKitPrebuilt.create(token)

    await zp.joinRoom({
      container: element,
      scenario: {
        mode: ZegoUIKitPrebuilt.OneONoneCall,
      },
      showScreenSharingButton: false,
      showPreJoinView: false,
      turnOnCameraWhenJoining: false,
      onLeaveRoom: onCallEnd,
      showUserList: false,
    })

    return zp
  }

  // Create a video call instance
  async createVideoCall(element, token, roomID, onCallEnd) {
    if (!this.initialized) {
      console.error("ZegoCloud not initialized")
      return null
    }

    const zp = ZegoUIKitPrebuilt.create(token)

    await zp.joinRoom({
      container: element,
      scenario: {
        mode: ZegoUIKitPrebuilt.OneONoneCall,
      },
      showScreenSharingButton: true,
      showPreJoinView: false,
      turnOnCameraWhenJoining: true,
      onLeaveRoom: onCallEnd,
    })

    return zp
  }

  // Destroy the call instance
  destroyCall(zegoInstance) {
    if (zegoInstance) {
      zegoInstance.destroy()
    }
  }
}

// Create a singleton instance
const zegoCloudService = new ZegoCloudService()
export default zegoCloudService
