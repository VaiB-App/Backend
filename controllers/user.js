import { compare } from "bcrypt";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { TryCatch } from "../middlewares/error.js";

import { Request } from "../models/request.js";



import { User } from '../models/user.js';
import { Chat } from '../models/chat.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';





import {
  cookieOptions,
  emitEvent,
  sendToken,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

// Create a new user and save it to the database and save token in cookie
const newUser = TryCatch(async (req, res, next) => {
  const { name, username, password, bio } = req.body;

  const file = req.file;

  if (!file) return next(new ErrorHandler("Please Upload Avatar"));

  const result = await uploadFilesToCloudinary([file]);

  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };

  const user = await User.create({
    name,
    bio,
    username,
    password,
    avatar,
  });

  sendToken(res, user, 201, "User created");
});

// Login user and save token in cookie
const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password");

  if (!user) return next(new ErrorHandler("Invalid Username or Password", 404));

  const isMatch = await compare(password, user.password);

  if (!isMatch)
    return next(new ErrorHandler("Invalid Username or Password", 404));

  sendToken(res, user, 200, `Welcome Back, ${user.name}`);
});

const getMyProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);

  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({
    success: true,
    user,
  });
});

const logout = TryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie("chattu-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out successfully",
    });
});

const searchUser = TryCatch(async (req, res) => {
  const { name = "" } = req.query;

  // Finding All my chats
  const myChats = await Chat.find({ groupChat: false, members: req.user });

  //  extracting All Users from my chats means friends or people I have chatted with
  const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

  // Finding all users except me and my friends
  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  // Modifying the response
  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    users,
  });
});

const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;

  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });

  if (request) return next(new ErrorHandler("Request already sent", 400));

  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  emitEvent(req, NEW_REQUEST, [userId]);

  return res.status(200).json({
    success: true,
    message: "Friend Request Sent",
  });
});

const acceptFriendRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) return next(new ErrorHandler("Request not found", 404));

  if (request.receiver._id.toString() !== req.user.toString())
    return next(
      new ErrorHandler("You are not authorized to accept this request", 401)
    );

  if (!accept) {
    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Friend Request Rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Friend Request Accepted",
    senderId: request.sender._id,
  });
});

const getMyNotifications = TryCatch(async (req, res) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  return res.status(200).json({
    success: true,
    allRequests,
  });
});

const getMyFriends = TryCatch(async (req, res) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);

    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });




  if (chatId) {
    const chat = await Chat.findById(chatId);

    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );

    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});


  // // Add this function to your user controller

  // const blockUser = async (req, res, next) => {
  //   try {
  //     const userIdToBlock = req.params.id
  //     const currentUserId = req.user._id
  
  //     // Verify users exist
  //     const [userToBlock, currentUser] = await Promise.all([User.findById(userIdToBlock), User.findById(currentUserId)])
  
  //     if (!userToBlock) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "User to block not found",
  //       })
  //     }
  
  //     // Add to blocked users array
  //     if (!currentUser.blockedUsers.includes(userIdToBlock)) {
  //       currentUser.blockedUsers.push(userIdToBlock)
  //       await currentUser.save()
  //     }
  
  //     // Remove from friends if they are friends
  //     if (currentUser.friends.includes(userIdToBlock)) {
  //       currentUser.friends = currentUser.friends.filter((friendId) => friendId.toString() !== userIdToBlock.toString())
  //       await currentUser.save()
  //     }
  
  //     // Update chats
  //     await Chat.updateMany(
  //       {
  //         isGroupChat: false,
  //         members: { $all: [currentUserId, userIdToBlock] },
  //       },
  //       { $set: { blocked: true, blockedBy: currentUserId } },
  //     )
  
  //     res.status(200).json({
  //       success: true,
  //       message: "User blocked successfully",
  //     })
  //   } catch (error) {
  //     next(error)
  //   }
  // };



//   // Block a user
// export const blockUser = asyncHandler(async (req, res) => {
//   const userIdToBlock = req.params.id;
//   const currentUserId = req.user._id;

//   // Check if trying to block self
//   if (userIdToBlock.toString() === currentUserId.toString()) {
//     throw new ApiError(400, "You cannot block yourself");
//   }

//   // Verify users exist
//   const userToBlock = await User.findById(userIdToBlock);
//   if (!userToBlock) {
//     throw new ApiError(404, "User to block not found");
//   }

//   // Get current user
//   const currentUser = await User.findById(currentUserId);
//   if (!currentUser) {
//     throw new ApiError(404, "Current user not found");
//   }

//   // Check if already blocked
//   if (currentUser.blockedUsers && currentUser.blockedUsers.includes(userIdToBlock)) {
//     return res.status(200).json({
//       success: true,
//       message: "User is already blocked"
//     });
//   }

//   // Add to blocked users array
//   if (!currentUser.blockedUsers) {
//     currentUser.blockedUsers = [];
//   }
  
//   currentUser.blockedUsers.push(userIdToBlock);

//   // Remove from friends if they are friends
//   if (currentUser.friends && currentUser.friends.includes(userIdToBlock)) {
//     currentUser.friends = currentUser.friends.filter(
//       friendId => friendId.toString() !== userIdToBlock.toString()
//     );
//   }

//   await currentUser.save();

//   // Update chats
//   await Chat.updateMany(
//     {
//       groupChat: false,
//       members: { $all: [currentUserId, userIdToBlock] }
//     },
//     { $set: { blocked: true, blockedBy: currentUserId } }
//   );

//   return res.status(200).json({
//     success: true,
//     message: "User blocked successfully"
//   });
// });

// // Unblock a user
// export const unblockUser = asyncHandler(async (req, res) => {
//   const userIdToUnblock = req.params.id;
//   const currentUserId = req.user._id;

//   // Get current user
//   const currentUser = await User.findById(currentUserId);
//   if (!currentUser) {
//     throw new ApiError(404, "Current user not found");
//   }

//   // Check if not blocked
//   if (!currentUser.blockedUsers || !currentUser.blockedUsers.includes(userIdToUnblock)) {
//     return res.status(200).json({
//       success: true,
//       message: "User is not blocked"
//     });
//   }

//   // Remove from blocked users array
//   currentUser.blockedUsers = currentUser.blockedUsers.filter(
//     blockedId => blockedId.toString() !== userIdToUnblock.toString()
//   );

//   await currentUser.save();

//   // Update chats
//   await Chat.updateMany(
//     {
//       groupChat: false,
//       members: { $all: [currentUserId, userIdToUnblock] },
//       blockedBy: currentUserId
//     },
//     { $set: { blocked: false, blockedBy: null } }
//   );

//   return res.status(200).json({
//     success: true,
//     message: "User unblocked successfully"
//   });
// });

// // Get blocked users
// export const getBlockedUsers = asyncHandler(async (req, res) => {
//   const currentUserId = req.user._id;

//   const currentUser = await User.findById(currentUserId)
//     .populate('blockedUsers', 'name username avatar');
  
//   if (!currentUser) {
//     throw new ApiError(404, "User not found");
//   }

//   return res.status(200).json({
//     success: true,
//     blockedUsers: currentUser.blockedUsers || []
//   });
// });



// Block a user
export const blockUser = asyncHandler(async (req, res) => {
  try {
    const userIdToBlock = req.params.id;
    const currentUserId = req.user._id;

    // Check if trying to block self
    if (userIdToBlock === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot block yourself"
      });
    }

    // Verify users exist
    const userToBlock = await User.findById(userIdToBlock);
    if (!userToBlock) {
      return res.status(404).json({
        success: false,
        message: "User to block not found"
      });
    }

    // Get current user
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Current user not found"
      });
    }

    // Initialize blockedUsers array if it doesn't exist
    if (!currentUser.blockedUsers) {
      currentUser.blockedUsers = [];
    }

    // Check if already blocked
    if (currentUser.blockedUsers.includes(userIdToBlock)) {
      return res.status(200).json({
        success: true,
        message: "User is already blocked"
      });
    }

    // Add to blocked users array
    currentUser.blockedUsers.push(userIdToBlock);

    // Remove from friends if they are friends
    if (currentUser.friends) {
      currentUser.friends = currentUser.friends.filter(
        friendId => friendId.toString() !== userIdToBlock.toString()
      );
    }

    await currentUser.save();

    // Update chats - FIXED: Make sure Chat model is properly imported and initialized
    try {
      await Chat.updateMany(
        {
          groupChat: false,
          members: { $all: [currentUserId, userIdToBlock] }
        },
        { $set: { blocked: true, blockedBy: currentUserId } }
      );
    } catch (chatError) {
      console.error("Error updating chats:", chatError);
      // Continue execution even if chat update fails
    }

    return res.status(200).json({
      success: true,
      message: "User blocked successfully"
    });
  } catch (error) {
    console.error("Block user error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});

// Unblock a user
export const unblockUser = asyncHandler(async (req, res) => {
  try {
    const userIdToUnblock = req.params.id;
    const currentUserId = req.user._id;

    // Get current user
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Current user not found"
      });
    }

    // Check if not blocked
    if (!currentUser.blockedUsers || !currentUser.blockedUsers.includes(userIdToUnblock)) {
      return res.status(200).json({
        success: true,
        message: "User is not blocked"
      });
    }

    // Remove from blocked users array
    currentUser.blockedUsers = currentUser.blockedUsers.filter(
      blockedId => blockedId.toString() !== userIdToUnblock.toString()
    );

    await currentUser.save();

    // Update chats
    try {
      await Chat.updateMany(
        {
          groupChat: false,
          members: { $all: [currentUserId, userIdToUnblock] },
          blockedBy: currentUserId
        },
        { $set: { blocked: false, blockedBy: null } }
      );
    } catch (chatError) {
      console.error("Error updating chats:", chatError);
      // Continue execution even if chat update fails
    }

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully"
    });
  } catch (error) {
    console.error("Unblock user error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});

// Get blocked users
export const getBlockedUsers = asyncHandler(async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId)
      .populate('blockedUsers', 'name username avatar');
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      blockedUsers: currentUser.blockedUsers || []
    });
  } catch (error) {
    console.error("Get blocked users error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});



export {
  
  acceptFriendRequest,
  getMyFriends,
  getMyNotifications,
  getMyProfile,
  login,
  logout,
  newUser,
  searchUser,
  sendFriendRequest,
};