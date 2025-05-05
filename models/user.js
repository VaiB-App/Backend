import mongoose, { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

// const schema = new Schema(
//   {
    
    
//     name: {
//       type: String,
//       required: true,
//     },
//     username: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     password: {
//       type: String,
//       required: true,
//       select: false,
//     },
//     avatar: {
//       public_id: {
//         type: String,
//         required: true,
//       },
//       url: {
//         type: String,
//         required: true,
//       },
//     },
//     bio: {
//       type: String,
//       required: true,
//     },
//     friends: {
//       type: [mongoose.Schema.Types.ObjectId],
//       ref: "User",
//       default: [],
//     },
//     blockedUsers: {
//       type: [mongoose.Schema.Types.ObjectId],
//       ref: "User",
//       default: [],
//     },
//   },
//   {
//     timestamps: true,
//   }
// );


const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    avatar: {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    spamReportCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);




// schema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();

//   this.password = await hash(this.password, 10);
// });

// Password hashing middleware
schema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
schema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};




export const User = mongoose.models.User || model("User", schema);