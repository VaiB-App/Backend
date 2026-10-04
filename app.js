

import express from "express"
import { connectDB } from "./utils/features.js"
import dotenv from "dotenv"
import { errorMiddleware } from "./middlewares/error.js"
import cookieParser from "cookie-parser"
import { Server } from "socket.io"
import { createServer } from "http"
import { v4 as uuid } from "uuid"
import cors from "cors"
import { v2 as cloudinary } from "cloudinary"
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
  INAPPROPRIATE_MESSAGE,
  SPAM_DETECTED,
  BLOCK_USER,
  USER_BLOCKED,
  MESSAGE_BLOCKED,
  REPLY_MESSAGE,
  UNBLOCK_USER,
  GET_BLOCKED_USERS,
  MESSAGE_FROM_BLOCKED_USER,
  USER_BLOCKED_FOR_INAPPROPRIATE,
} from "./constants/events.js"
import { getSockets } from "./lib/helper.js"
import { userSocketIDs, userSocketIDSets } from "./lib/socketState.js"
import { Message } from "./models/message.js"
import { Chat } from "./models/Chat.js"
import { User } from "./models/user.js"
import { corsOptions } from "./constants/config.js"
import { socketAuthenticator } from "./middlewares/auth.js"
import { checkSpamContent, analyzeImageForSpam, blockUser, checkUserSpamHistory } from "./middlewares/spamFilter.js"
import { handleBlockUser, handleUnblockUser, getBlockedUsers, isUserBlocked } from "./controllers/chat.js"
// Import the new inappropriate content filter functions
import { 
  checkInappropriateContent, 
  blockUserForInappropriate, 
  checkUserInappropriateHistory 
} from "./middlewares/InappropriateContentFilter.js"

import userRoute from "./routes/user.js"
import chatRoute from "./routes/chat.js"
import adminRoute from "./routes/admin.js"


dotenv.config({
  path: "./.env",
})

const mongoURI = process.env.MONGO_URI
const port = process.env.PORT || 3000
const envMode = process.env.NODE_ENV?.trim() || "PRODUCTION"
const adminSecretKey = process.env.ADMIN_SECRET_KEY || "adsasdsdfsdfsdfd"
const onlineUsers = new Set()
const callSessions = new Map()

// Helper function to find socket by user ID - Fixed to handle undefined/null userId
const findSocketByUserId = (userId) => {
  if (!userId) {
    console.warn("findSocketByUserId called with undefined or null userId")
    return null
  }
  
  const socketId = userSocketIDs.get(userId.toString())
  return socketId ? io.sockets.sockets.get(socketId) : null
}

connectDB(mongoURI)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})



const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: corsOptions,
})

app.set("io", io)

// Using Middlewares Here
app.use(express.json())
app.use(cookieParser())
app.use(cors(corsOptions))

app.use("/api/v1/user", userRoute)
app.use("/api/v1/chat", chatRoute)
app.use("/api/v1/admin", adminRoute)

app.get("/", (req, res) => {
  res.send("Hello World")
})

io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => await socketAuthenticator(err, socket, next))
})

io.on("connection", (socket) => {
  const user = socket.user
  const userId = user._id.toString()
  userSocketIDs.set(userId, socket.id)
  const activeSocketIds = userSocketIDSets.get(userId) || new Set()
  activeSocketIds.add(socket.id)
  userSocketIDSets.set(userId, activeSocketIds)

  // Handle reply messages
  socket.on(REPLY_MESSAGE, async ({ chatId, members, message, replyToId, replyToSender, replyToContent }) => {
    try {
      // Check if any member has blocked the sender
      for (const memberId of members) {
        if (memberId.toString() === user._id.toString()) continue // Skip self

        const isBlocked = await isUserBlocked(memberId, user._id)
        if (isBlocked) {
          // Notify sender that message was blocked
          socket.emit(MESSAGE_BLOCKED, {
            message: "Your message was not delivered because you have been blocked by the recipient.",
          })

          // Emit event to sender about being blocked
          socket.emit(MESSAGE_FROM_BLOCKED_USER, {
            blockedBy: memberId,
          })

          return // Stop processing this message
        }
      }

      // Check if message contains inappropriate content
      const isInappropriate = checkInappropriateContent(message, user._id.toString())
      if (isInappropriate) {
        // Handle inappropriate content
        const sender = {
          _id: user._id,
          name: user.name,
        }

        const recipientMembers = members.filter((id) => id.toString() !== user._id.toString())
        const membersSocket = getSockets(recipientMembers)

        io.to(membersSocket).emit(INAPPROPRIATE_MESSAGE, {
          chatId,
          message: {
            content: message,
            sender,
          },
        })

        // Mark message as inappropriate in database
        const messageForDB = {
          content: message,
          sender: user._id,
          chat: chatId,
          replyTo: replyToId,
          isInappropriate: true,
        }

        try {
          await Message.create(messageForDB)
        } catch (error) {
          console.error("Error saving inappropriate message:", error)
        }

        // Check if user has a history of inappropriate content
        const hasInappropriateHistory = await checkUserInappropriateHistory(user._id)
        if (hasInappropriateHistory) {
          // Automatically block the user for recipients
          for (const memberId of recipientMembers) {
            await blockUserForInappropriate(user._id.toString(), memberId.toString())
            
            // Notify the recipient that they've blocked this user
            const recipientSocket = findSocketByUserId(memberId)
            if (recipientSocket) {
              recipientSocket.emit(USER_BLOCKED_FOR_INAPPROPRIATE, {
                blockedUser: {
                  _id: user._id,
                  name: user.name,
                },
                message: "User has been automatically blocked due to inappropriate content."
              })
            }
          }
        }

        return // Don't process further if inappropriate content
      }

      // Check if message is spam
      const isSpam = checkSpamContent(message, user._id.toString())
      const hasSpamHistory = await checkUserSpamHistory(user._id)

      // If spam is detected, notify recipients
      if (isSpam || hasSpamHistory) {
        const recipientMembers = members.filter((id) => id.toString() !== user._id.toString())
        const membersSocket = getSockets(recipientMembers)

        io.to(membersSocket).emit(SPAM_DETECTED, {
          chatId,
          message: {
            content: message,
            sender: {
              _id: user._id,
              name: user.name,
            },
          },
        })

        // Mark message as spam in database
        const messageForDB = {
          content: message,
          sender: user._id,
          chat: chatId,
          replyTo: replyToId,
          isSpam: true,
        }

        try {
          await Message.create(messageForDB)
        } catch (error) {
          console.error("Error saving spam message:", error)
        }

        return // Don't process further if spam
      }

      // Create message for real-time display
      const messageForRealTime = {
        content: message,
        _id: uuid(),
        sender: {
          _id: user._id,
          name: user.name,
        },
        chat: chatId,
        createdAt: new Date().toISOString(),
        replyTo: replyToId,
        replyToMessage: {
          _id: replyToId,
          content: replyToContent,
          sender: replyToSender,
        },
      }

      // Create message for database
      const messageForDB = {
        content: message,
        sender: user._id,
        chat: chatId,
        replyTo: replyToId,
      }

      // Send to all members
      const membersSocket = getSockets(members)
      io.to(membersSocket).emit(REPLY_MESSAGE, {
        chatId,
        message: messageForRealTime,
      })
      io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId })

      try {
        await Message.create(messageForDB)
      } catch (error) {
        console.error("Error creating message:", error)
      }
    } catch (error) {
      console.error("Error in REPLY_MESSAGE event:", error)
    }
  })

  socket.on(NEW_MESSAGE, async ({ chatId, members, message, attachments = [] }) => {
    try {
      // Check if any member has blocked the sender
      for (const memberId of members) {
        if (memberId.toString() === user._id.toString()) continue // Skip self

        const isBlocked = await isUserBlocked(memberId, user._id)
        if (isBlocked) {
          // Notify sender that message was blocked
          socket.emit(MESSAGE_BLOCKED, {
            message: "Your message was not delivered because you have been blocked by the recipient.",
          })

          // Emit event to sender about being blocked
          socket.emit(MESSAGE_FROM_BLOCKED_USER, {
            blockedBy: memberId,
          })

          return // Stop processing this message
        }
      }

      // Check if message contains inappropriate content
      const isInappropriate = checkInappropriateContent(message, user._id.toString())
      if (isInappropriate) {
        // Get the sender's information
        const sender = {
          _id: user._id,
          name: user.name,
        }

        // Notify the recipients about inappropriate content
        const recipientMembers = members.filter((id) => id.toString() !== user._id.toString())
        const membersSocket = getSockets(recipientMembers)

        io.to(membersSocket).emit(INAPPROPRIATE_MESSAGE, {
          chatId,
          message: {
            content: message,
            sender,
          },
        })

        // Mark message as inappropriate in database
        const messageForDB = {
          content: message,
          sender: user._id,
          chat: chatId,
          isInappropriate: true,
        }

        if (attachments && attachments.length > 0) {
          messageForDB.attachments = attachments
        }

        try {
          await Message.create(messageForDB)
        } catch (error) {
          console.error("Error saving inappropriate message:", error)
        }

        // Check if user has a history of inappropriate content
        const hasInappropriateHistory = await checkUserInappropriateHistory(user._id)
        if (hasInappropriateHistory) {
          // Automatically block the user for recipients
          for (const memberId of recipientMembers) {
            await blockUserForInappropriate(user._id.toString(), memberId.toString())
            
            // Notify the recipient that they've blocked this user
            const recipientSocket = findSocketByUserId(memberId)
            if (recipientSocket) {
              recipientSocket.emit(USER_BLOCKED_FOR_INAPPROPRIATE, {
                blockedUser: {
                  _id: user._id,
                  name: user.name,
                },
                message: "User has been automatically blocked due to inappropriate content."
              })
            }
          }
        }

        return // Don't process further if inappropriate content
      }

      // NEW: Check if message is spam
      const isSpam = checkSpamContent(message, user._id.toString())
      let isImageSpam = false

      // Check if there are image attachments to analyze
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          if (
            attachment.url &&
            (attachment.url.endsWith(".jpg") ||
              attachment.url.endsWith(".jpeg") ||
              attachment.url.endsWith(".png") ||
              attachment.url.endsWith(".gif"))
          ) {
            isImageSpam = await analyzeImageForSpam(attachment.url)
            if (isImageSpam) break
          }
        }
      }

      // Also check user's spam history
      const hasSpamHistory = await checkUserSpamHistory(user._id)

      // If spam is detected, notify recipients
      if (isSpam || isImageSpam || hasSpamHistory) {
        const recipientMembers = members.filter((id) => id.toString() !== user._id.toString())
        const membersSocket = getSockets(recipientMembers)

        io.to(membersSocket).emit(SPAM_DETECTED, {
          chatId,
          message: {
            content: message,
            sender: {
              _id: user._id,
              name: user.name,
            },
          },
        })

        // Mark message as spam in database
        const messageForDB = {
          content: message,
          sender: user._id,
          chat: chatId,
          isSpam: true,
        }

        if (attachments && attachments.length > 0) {
          messageForDB.attachments = attachments
        }

        try {
          await Message.create(messageForDB)
        } catch (error) {
          console.error("Error saving spam message:", error)
        }

        return // Don't process further if spam
      }

      // Continue with normal message processing
      const messageForRealTime = {
        content: message,
        _id: uuid(),
        sender: {
          _id: user._id,
          name: user.name,
        },
        chat: chatId,
        createdAt: new Date().toISOString(),
      }

      if (attachments && attachments.length > 0) {
        messageForRealTime.attachments = attachments
      }

      const messageForDB = {
        content: message,
        sender: user._id,
        chat: chatId,
      }

      if (attachments && attachments.length > 0) {
        messageForDB.attachments = attachments
      }

      const membersSocket = getSockets(members)
      io.to(membersSocket).emit(NEW_MESSAGE, {
        chatId,
        message: messageForRealTime,
      })
      io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId })

      try {
        await Message.create(messageForDB)
      } catch (error) {
        console.error("Error creating message:", error)
      }
    } catch (error) {
      console.error("Error in NEW_MESSAGE event:", error)
    }
  })

  // NEW: Handle block user request
  socket.on(BLOCK_USER, async ({ userId }) => {
    try {
      const success = await blockUser(userId, user._id.toString())

      if (success) {
        // Notify the blocked user
        const blockedUserSocketId = userSocketIDs.get(userId)

        if (blockedUserSocketId) {
          io.to(blockedUserSocketId).emit(USER_BLOCKED, {
            blockedBy: {
              _id: user._id,
              name: user.name,
            },
          })
        }

        // Notify the user who blocked
        socket.emit(MESSAGE_BLOCKED, {
          message: `You have successfully blocked the user.`,
          blockedUserId: userId,
        })
      }
    } catch (error) {
      console.error("Error blocking user:", error)
      socket.emit(MESSAGE_BLOCKED, {
        message: `Failed to block user. Please try again.`,
        error: true,
      })
    }
  })

  socket.on(START_TYPING, ({ members, chatId }) => {
    try {
      const membersSockets = getSockets(members)
      socket.to(membersSockets).emit(START_TYPING, { chatId, senderId: user._id.toString() })
    } catch (error) {
      console.error("Error in START_TYPING event:", error)
    }
  })

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    try {
      const membersSockets = getSockets(members)
      socket.to(membersSockets).emit(STOP_TYPING, { chatId, senderId: user._id.toString() })
    } catch (error) {
      console.error("Error in STOP_TYPING event:", error)
    }
  })

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    try {
      onlineUsers.add(userId.toString())

      const membersSocket = getSockets(members)
      io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers))
    } catch (error) {
      console.error("Error in CHAT_JOINED event:", error)
    }
  })

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    try {
      onlineUsers.delete(userId.toString())

      const membersSocket = getSockets(members)
      io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers))
    } catch (error) {
      console.error("Error in CHAT_LEAVED event:", error)
    }
  })

  // Block user handler
  socket.on(BLOCK_USER, async ({ userId }) => {
    try {
      const result = await handleBlockUser(user._id, userId)

      if (result.success) {
        // Notify the current user
        socket.emit(USER_BLOCKED, {
          blockedUser: result.blockedUser,
        })

        // Find the blocked user's socket and notify them if they're online
        const blockedUserSocket = findSocketByUserId(userId)
        if (blockedUserSocket) {
          blockedUserSocket.emit("you-are-blocked", {
            by: user._id,
            byName: user.name,
          })
        }
      }
    } catch (error) {
      console.error("Error in BLOCK_USER event:", error)
    }
  })

  // Unblock user handler
  socket.on(UNBLOCK_USER, async ({ userId }) => {
    try {
      const result = await handleUnblockUser(user._id, userId)

      if (result.success) {
        // Notify the current user
        socket.emit("user-unblocked", { userId })
      }
    } catch (error) {
      console.error("Error in UNBLOCK_USER event:", error)
    }
  })

  // Get blocked users handler
  socket.on(GET_BLOCKED_USERS, async () => {
    try {
      const result = await getBlockedUsers(user._id)

      socket.emit("blocked-users-response", {
        blockedUsers: result.blockedUsers,
      })
    } catch (error) {
      console.error("Error in GET_BLOCKED_USERS event:", error)
      socket.emit("blocked-users-response", { blockedUsers: [] })
    }
  })

  // Call invitations and WebRTC signaling are relayed through Socket.IO.
  socket.on("call:request", async (data = {}) => {
    const callId = String(data.callId || "")
    const recipientId = String(data.to || "")
    const chatId = String(data.chatId || "")
    const callerId = user._id.toString()
    if (!callId || !recipientId || !chatId || recipientId === callerId || callSessions.has(callId)) return

    try {
      const chat = await Chat.findOne({
        _id: chatId,
        members: { $all: [user._id, recipientId] },
        groupChat: false,
      }).select("_id")
      const callerProfile = await User.findById(callerId).select("name avatar.url")
      const recipientSocketIds = Array.from(userSocketIDSets.get(recipientId) || [])
        .filter((socketId) => io.sockets.sockets.has(socketId))
      // Keep the legacy map as a fallback for sockets registered before the
      // multi-socket set was populated (for example during a rolling restart).
      const legacyRecipientSocketId = userSocketIDs.get(recipientId)
      if (!recipientSocketIds.length && legacyRecipientSocketId && io.sockets.sockets.has(legacyRecipientSocketId)) {
        recipientSocketIds.push(legacyRecipientSocketId)
      }
      if (!chat || !callerProfile || !recipientSocketIds.length) {
        socket.emit("call:reject", { callId, reason: "offline" })
        if (chat) {
          void saveCallHistory({
            callId,
            chatId,
            callerId,
            callerName: user.name,
            calleeId: recipientId,
            isVideo: Boolean(data.isVideo),
          }, "missed")
        }
        return
      }

      const session = {
        callId,
        chatId,
        callerId,
        callerName: user.name,
        calleeId: recipientId,
        callerSocketId: socket.id,
        calleeSocketIds: recipientSocketIds,
        status: "ringing",
        isVideo: Boolean(data.isVideo),
        connectedAt: null,
        timeout: null,
      }
      callSessions.set(callId, session)
      session.timeout = setTimeout(() => {
        if (callSessions.get(callId) !== session || session.status !== "ringing") return
        callSessions.delete(callId)
        io.to(session.callerSocketId).emit("call:end", { callId, reason: "timeout" })
        io.to(session.calleeSocketIds).emit("call:end", { callId, reason: "timeout" })
        void saveCallHistory(session, "missed")
      }, 60000)

      io.to(recipientSocketIds).emit("call:request", {
        callId,
        chatId,
        from: callerId,
        fromName: callerProfile.name,
        fromAvatar: callerProfile.avatar?.url || "",
        isVideo: Boolean(data.isVideo),
      })
    } catch (error) {
      console.error("Could not start call", error)
      socket.emit("call:reject", { callId, reason: "unavailable" })
    }
  })

  const saveCallHistory = async (session, status, durationSeconds = 0) => {
    try {
      const callMessage = await Message.create({
        type: "call",
        call: { isVideo: session.isVideo, status, durationSeconds },
        content: "",
        sender: session.callerId,
        chat: session.chatId,
      })
      const messageForRealTime = {
        _id: callMessage._id,
        type: "call",
        call: callMessage.call,
        content: "",
        sender: { _id: session.callerId, name: session.callerName || "User" },
        chat: session.chatId,
        createdAt: callMessage.createdAt,
      }
      const membersSocket = getSockets([session.callerId, session.calleeId])
      io.to(membersSocket).emit(NEW_MESSAGE, { chatId: session.chatId, message: messageForRealTime })
      io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId: session.chatId })
    } catch (error) {
      console.error("Could not save call history", error)
    }
  }

  const forwardCallEvent = (event, getPayload) => {
    socket.on(event, (data = {}) => {
      const session = callSessions.get(String(data.callId || ""))
      if (!session) return

      const fromCaller = session.callerSocketId === socket.id
      const fromCallee = session.calleeSocketIds.includes(socket.id)
      if (!fromCaller && !fromCallee) return
      const peerId = fromCaller ? session.calleeId : session.callerId
      const targetSocketId = fromCaller ? session.calleeSocketIds : session.callerSocketId
      if (data.to && String(data.to) !== peerId) return

      if (event === "call:accept") {
        if (!fromCallee || session.status !== "ringing") return
        session.status = "active"
        session.connectedAt = Date.now()
        clearTimeout(session.timeout)
      } else if (event !== "call:reject" && event !== "call:end" && session.status !== "active") {
        return
      }

      io.to(targetSocketId).emit(event, { callId: session.callId, ...getPayload(data, user) })
      if (event === "call:reject" || event === "call:end") {
        clearTimeout(session.timeout)
        callSessions.delete(session.callId)
        const status = event === "call:reject" ? "missed" : (session.status === "active" ? "completed" : "missed")
        const durationSeconds = session.status === "active" && session.connectedAt
          ? Math.max(0, Math.round((Date.now() - session.connectedAt) / 1000))
          : 0
        void saveCallHistory(session, status, durationSeconds)
      }
    })
  }

  forwardCallEvent("call:accept", () => ({}))
  forwardCallEvent("call:reject", (data) => ({ reason: data.reason || "declined" }))
  forwardCallEvent("call:end", (data) => ({ reason: data.reason || "ended" }))
  forwardCallEvent("call:ready", (_data, sender) => ({ userId: sender._id.toString() }))
  forwardCallEvent("call:offer", (data) => ({ description: data.description }))
  forwardCallEvent("call:answer", (data) => ({ description: data.description }))
  forwardCallEvent("call:ice-candidate", (data) => ({ candidate: data.candidate }))
  socket.on("disconnect", () => {
    try {
      const userId = user._id.toString()
      const activeSocketIds = userSocketIDSets.get(userId)
      activeSocketIds?.delete(socket.id)
      if (activeSocketIds?.size) {
        userSocketIDs.set(userId, activeSocketIds.values().next().value)
      } else {
        userSocketIDSets.delete(userId)
        userSocketIDs.delete(userId)
        onlineUsers.delete(userId)
      }
      for (const [callId, session] of callSessions) {
        if (session.callerSocketId !== socket.id && !session.calleeSocketIds.includes(socket.id)) continue
        const peerSocketId = session.callerSocketId === socket.id ? session.calleeSocketIds : session.callerSocketId
        clearTimeout(session.timeout)
        io.to(peerSocketId).emit("call:end", { callId, reason: "disconnected" })
        callSessions.delete(callId)
        const status = session.status === "active" ? "completed" : "missed"
        const durationSeconds = session.status === "active" && session.connectedAt
          ? Math.max(0, Math.round((Date.now() - session.connectedAt) / 1000))
          : 0
        void saveCallHistory(session, status, durationSeconds)
      }
      socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers))
    } catch (error) {
      console.error("Error in disconnect event:", error)
    }
  })

  // Add a new socket event handler for blocking users due to inappropriate content
  socket.on("block-for-inappropriate", async ({ userId }) => {
    try {
      const success = await blockUserForInappropriate(userId, user._id.toString())

      if (success) {
        // Notify the blocked user
        const blockedUserSocketId = userSocketIDs.get(userId)

        if (blockedUserSocketId) {
          io.to(blockedUserSocketId).emit(USER_BLOCKED, {
            blockedBy: {
              _id: user._id,
              name: user.name,
            },
            reason: "inappropriate content"
          })
        }

        // Notify the user who blocked
        socket.emit(MESSAGE_BLOCKED, {
          message: `You have successfully blocked the user for inappropriate content.`,
          blockedUserId: userId,
        })
      }
    } catch (error) {
      console.error("Error blocking user for inappropriate content:", error)
      socket.emit(MESSAGE_BLOCKED, {
        message: `Failed to block user. Please try again.`,
        error: true,
      })
    }
  })
})

app.use(errorMiddleware)

server.listen(port, () => {
  console.log(`Server is running on port ${port} in ${envMode} Mode`)
})

export { envMode, adminSecretKey, userSocketIDs, userSocketIDSets }
