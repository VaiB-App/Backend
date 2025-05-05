import mongoose, { Schema, model, Types } from "mongoose";

// const schema = new Schema(
//   {
//     content: String,

//     attachments: [
//       {
//         public_id: {
//           type: String,
//           required: true,
//         },
//         url: {
//           type: String,
//           required: true,
//         },
//       },
//     ],

//     sender: {
//       type: Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     chat: {
//       type: Types.ObjectId,
//       ref: "Chat",
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// export const Message = mongoose.models.Message || model("Message", schema);





const schema = new Schema(
  {
    content: String,

    attachments: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    // Add reply reference
    replyTo: {
      //type: Types.ObjectId,
      type: String,
      ref: "Message",
      default: null,
    },
    isSpam: {
      type: Boolean,
      default: false,
    },
    spamReportedBy: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
)

export const Message = mongoose.models.Message || model("Message", schema)
