// import { checkInappropriateContent } from "./middlewares/messageFilter.js"
// import express from "express";
// import { connectDB } from "./utils/features.js";
// import dotenv from "dotenv";
// import { errorMiddleware } from "./middlewares/error.js";
// import cookieParser from "cookie-parser";
// import { Server } from "socket.io";
// import { createServer } from "http";
// import { v4 as uuid } from "uuid";
// import cors from "cors";
// import { v2 as cloudinary } from "cloudinary";
// import {
//   CHAT_JOINED,
//   CHAT_LEAVED,
//   NEW_MESSAGE,
//   NEW_MESSAGE_ALERT,
//   ONLINE_USERS,
//   START_TYPING,
//   STOP_TYPING,
// } from "./constants/events.js";
// import { getSockets } from "./lib/helper.js";
// import { Message } from "./models/message.js";
// import { corsOptions } from "./constants/config.js";
// import { socketAuthenticator } from "./middlewares/auth.js";

// import userRoute from "./routes/user.js";
// import chatRoute from "./routes/chat.js";
// import adminRoute from "./routes/admin.js";

// dotenv.config({
//   path: "./.env",
// });

// const mongoURI = process.env.MONGO_URI;
// const port = process.env.PORT || 3000;
// const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
// const adminSecretKey = process.env.ADMIN_SECRET_KEY || "adsasdsdfsdfsdfd";
// const userSocketIDs = new Map();
// const onlineUsers = new Set();

// connectDB(mongoURI);

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const app = express();
// const server = createServer(app);
// const io = new Server(server, {
//   cors: corsOptions,
// });

// app.set("io", io);

// // Using Middlewares Here
// app.use(express.json());
// app.use(cookieParser());
// app.use(cors(corsOptions));

// app.use("/api/v1/user", userRoute);
// app.use("/api/v1/chat", chatRoute);
// app.use("/api/v1/admin", adminRoute);

// app.get("/", (req, res) => {
//   res.send("Hello World");
// });

// io.use((socket, next) => {
//   cookieParser()(
//     socket.request,
//     socket.request.res,
//     async (err) => await socketAuthenticator(err, socket, next)
//   );
// });

// io.on("connection", (socket) => {
//   const user = socket.user;
//   userSocketIDs.set(user._id.toString(), socket.id);

//   socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
//     const messageForRealTime = {
//       content: message,
//       _id: uuid(),
//       sender: {
//         _id: user._id,
//         name: user.name,

        
//       },
      
//       chat: chatId,
//       createdAt: new Date().toISOString(),
//     };
//     const messageForDB = {
//       content: message,
//       sender: user._id,
//       chat: chatId,
//     };

//     const membersSocket = getSockets(members);
//     io.to(membersSocket).emit(NEW_MESSAGE, {
//       chatId,
//       message: messageForRealTime,
//     });
//     io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

//     try {
//       await Message.create(messageForDB);
//     } catch (error) {
//       throw new Error(error);
//     }
//   });

//   socket.on(START_TYPING, ({ members, chatId }) => {
//     const membersSockets = getSockets(members);
//     socket.to(membersSockets).emit(START_TYPING, { chatId });
//   });

//   socket.on(STOP_TYPING, ({ members, chatId }) => {
//     const membersSockets = getSockets(members);
//     socket.to(membersSockets).emit(STOP_TYPING, { chatId });
//   });

//   socket.on(CHAT_JOINED, ({ userId, members }) => {
//     onlineUsers.add(userId.toString());

//     const membersSocket = getSockets(members);
//     io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
//   });

//   socket.on(CHAT_LEAVED, ({ userId, members }) => {
//     onlineUsers.delete(userId.toString());

//     const membersSocket = getSockets(members);
//     io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
//   });

//   socket.on("disconnect", () => {
//     userSocketIDs.delete(user._id.toString());
//     onlineUsers.delete(user._id.toString());
//     socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
//   });
// });

// app.use(errorMiddleware);

// server.listen(port, () => {
//   console.log(`Server is running on port ${port} in ${envMode} Mode`);
// });

// export { envMode, adminSecretKey, userSocketIDs };





import express from "express";
import { connectDB } from "./utils/features.js";
import dotenv from "dotenv";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
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
  REPLY_MESSAGE,// Add this new event
} from "./constants/events.js";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.js";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";
import { checkInappropriateContent } from "./middlewares/messageFilter.js";
import { checkSpamContent, analyzeImageForSpam, blockUser, checkUserSpamHistory } from "./middlewares/spamFilter.js"

import userRoute from "./routes/user.js";
import chatRoute from "./routes/chat.js";
import adminRoute from "./routes/admin.js";

import { WebRTCService } from "./services/webrtc.js"

dotenv.config({
  path: "./.env",
});

const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
const adminSecretKey = process.env.ADMIN_SECRET_KEY || "adsasdsdfsdfsdfd";
const userSocketIDs = new Map();
const onlineUsers = new Set();

connectDB(mongoURI);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

// After initializing your Socket.io server:
// Initialize the WebRTC service with the Socket.io instance
const webRTCService = new WebRTCService(io)

// Using Middlewares Here
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.get("/", (req, res) => {
  res.send("Hello World");
});

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});

io.on("connection", (socket) => {
  const user = socket.user;
  userSocketIDs.set(user._id.toString(), socket.id);


   // Handle reply messages
  socket.on(REPLY_MESSAGE, async ({ chatId, members, message, replyToId, replyToSender, replyToContent }) => {
    // Check if message contains inappropriate content
    if (checkInappropriateContent(message)) {
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
      return
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

    // New handler for fetching latest messages
socket.on("get-latest-messages", async ({ chatId }) => {
  try {
    // Fetch the latest messages from MongoDB for this chat
    const latestMessages = await Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("sender")
      .lean()

    // Send the latest messages back to the client
    socket.emit("latest-messages-response", {
      chatId,
      messages: latestMessages.reverse(),
    })
  } catch (error) {
    console.error("Error fetching latest messages:", error)
  }
})

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
      throw new Error(error)
    }
  })

   
  

  socket.on(NEW_MESSAGE, async ({ chatId, members, message, attachments = []  }) => {
    // Check if message contains inappropriate content
    if (checkInappropriateContent(message)) {
      // Get the sender's information
      const sender = {
        _id: user._id,
        name: user.name,
      };

      // Notify the recipients about inappropriate content
      // We still save the message, but alert the recipient
      const recipientMembers = members.filter(
        (id) => id.toString() !== user._id.toString()
      );
      const membersSocket = getSockets(recipientMembers);

      io.to(membersSocket).emit(INAPPROPRIATE_MESSAGE, {
        chatId,
        message: {
          content: message,
          sender,
        },
      });
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
    };

    if (attachments && attachments.length > 0) {
      messageForRealTime.attachments = attachments
    }

    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    if (attachments && attachments.length > 0) {
      messageForDB.attachments = attachments
    }

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      await Message.create(messageForDB);
    } catch (error) {
      throw new Error(error);
    }
  });

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
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    userSocketIDs.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

app.use(errorMiddleware);

server.listen(port, () => {
  console.log(`Server is running on port ${port} in ${envMode} Mode`);
});

export { envMode, adminSecretKey, userSocketIDs };

