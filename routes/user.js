import express from "express";
import {
  acceptFriendRequest,
  getMyFriends,
  getMyNotifications,
  getMyProfile,
  login,
  logout,
  newUser,
  searchUser,
  sendFriendRequest,
} from "../controllers/user.js";
import {
  acceptRequestValidator,
  loginValidator,
  registerValidator,
  sendRequestValidator,
  validateHandler,
} from "../lib/validators.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { singleAvatar } from "../middlewares/multer.js";
import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import { blockUser, unblockUser, getBlockedUsers } from '../controllers/user.js';

const app = express.Router();

app.post("/new", singleAvatar, registerValidator(), validateHandler, newUser);
app.post("/login", loginValidator(), validateHandler, login);

// After here user must be logged in to access the routes

app.use(isAuthenticated);

app.get("/me", getMyProfile);

app.get("/logout", logout);

app.get("/search", searchUser);

app.put(
  "/sendrequest",
  sendRequestValidator(),
  validateHandler,
  sendFriendRequest
);

app.put(
  "/acceptrequest",
  acceptRequestValidator(),
  validateHandler,
  acceptFriendRequest
);

app.get("/notifications", getMyNotifications);

app.get("/friends", getMyFriends);


// Block a user
app.post("/block/:id", isAuthenticated, blockUser);

// Unblock a user
app.post("/unblock/:id", isAuthenticated, unblockUser);

// Get blocked users
app.get("/blocked", isAuthenticated, getBlockedUsers);



// // Add this new route to your user routes:

// app.post("/block/:id", isAuthenticated, async (req, res, next) => {
//   try {
//     const userId = req.params.id
//     const currentUser = req.user._id

//     // Add user to blocked list
//     await User.findByIdAndUpdate(currentUser, {
//       $addToSet: { blockedUsers: userId },
//     })

//     // Remove from friends list if they are friends
//     await User.findByIdAndUpdate(currentUser, {
//       $pull: { friends: userId },
//     })

//     // Remove from any direct chats (optional - depends on your app architecture)
//     const chats = await chats.find({
//       isGroupChat: false,
//       members: { $all: [currentUser, userId] },
//     })

//     for (const chat of chats) {
//       await Chat.findByIdAndUpdate(chat._id, {
//         $set: { blocked: true },
//       })
//     }

//     return res.status(200).json({
//       success: true,
//       message: "User blocked successfully",
//     })
//   } catch (error) {
//     next(error)
//   }
// })

// // Add this route handler
// app.post("/block/:id", isAuthenticated, async (req, res, next) => {
//   try {
//     const userIdToBlock = req.params.id;
//     const currentUserId = req.user._id;

//     // Verify users exist
//     const [userToBlock, currentUser] = await Promise.all([
//       User.findById(userIdToBlock),
//       User.findById(currentUserId)
//     ]);

//     if (!userToBlock) {
//       return res.status(404).json({
//         success: false,
//         message: "User to block not found"
//       });
//     }

//     // Add to blocked users array if not already blocked
//     if (!currentUser.blockedUsers.includes(userIdToBlock)) {
//       currentUser.blockedUsers.push(userIdToBlock);
//       await currentUser.save();
//     }

//     // Remove from friends if they are friends
//     if (currentUser.friends.includes(userIdToBlock)) {
//       currentUser.friends = currentUser.friends.filter(
//         friendId => friendId.toString() !== userIdToBlock.toString()
//       );
//       await currentUser.save();
//     }

//     // Update chats
//     await Chat.updateMany(
//       {
//         groupChat: false,
//         members: { $all: [currentUserId, userIdToBlock] }
//       },
//       { $set: { blocked: true, blockedBy: currentUserId } }
//     );

//     res.status(200).json({
//       success: true,
//       message: "User blocked successfully"
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// // Add a route to unblock a user
// app.post("/unblock/:id", isAuthenticated, async (req, res, next) => {
//   try {
//     const userIdToUnblock = req.params.id;
//     const currentUserId = req.user._id;

//     // Remove from blocked users array
//     await User.findByIdAndUpdate(currentUserId, {
//       $pull: { blockedUsers: userIdToUnblock }
//     });

//     // Update chats where this user blocked the other user
//     await Chat.updateMany(
//       {
//         groupChat: false,
//         members: { $all: [currentUserId, userIdToUnblock] },
//         blockedBy: currentUserId
//       },
//       { $set: { blocked: false, blockedBy: null } }
//     );

//     res.status(200).json({
//       success: true,
//       message: "User unblocked successfully"
//     });
//   } catch (error) {
//     next(error);
//   }
// });


// // Add a route to get blocked users
// app.get("/blocked", isAuthenticated, async (req, res, next) => {
//   try {
//     const currentUser = await User.findById(req.user._id)
//       .populate('blockedUsers', 'name username avatar');
    
//     if (!currentUser) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     res.status(200).json({
//       success: true,
//       blockedUsers: currentUser.blockedUsers
//     });
//   } catch (error) {
//     next(error);
//   }
// });



export default app;