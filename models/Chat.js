import mongoose, { Schema, model, Types } from "mongoose";

const schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    groupChat: {
      type: Boolean,
      default: false,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    members: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


const messageSchema = new mongoose.Schema({
  sender: {
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  chat: {
    type: Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  attachments: [
    {
      public_id: String,
      url: String,
    },
  ],
}, {
  timestamps: true,
});

// Static method to create a message
schema.statics.createMessage = async function (messageData) {
  try {
    const Message = mongoose.model('Message');
    const message = await Message.create(messageData);
    return message;
  } catch (error) {
    throw error;
  }
};



export const Chat =mongoose.models.Chat || model("Chat", schema);
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);





// import mongoose from 'mongoose';

// const messageSchema = new mongoose.Schema({
//   sender: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   content: {
//     type: String,
//     required: true,
//   },
//   chat: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Chat',
//     required: true,
//   },
//   attachments: [
//     {
//       public_id: String,
//       url: String,
//     },
//   ],
// }, {
//   timestamps: true,
// });

// const chatSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//   },
//   groupChat: {
//     type: Boolean,
//     default: false,
//   },
//   creator: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//   },
//   members: [
//     {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//     },
//   ],
//   blocked: {
//     type: Boolean,
//     default: false,
//   },
//   blockedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     default: null,
//   },
// }, {
//   timestamps: true,
// });

// // Static method to create a message
// chatSchema.statics.createMessage = async function (messageData) {
//   try {
//     const Message = mongoose.model('Message');
//     const message = await Message.create(messageData);
//     return message;
//   } catch (error) {
//     throw error;
//   }
// };

// export const Chat = mongoose.model('Chat', chatSchema);
// export const Message = mongoose.model('Message', messageSchema);