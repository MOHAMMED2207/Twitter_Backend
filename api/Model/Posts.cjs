const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
      required: true,
    },
    text: {
      type: String,
    },
    img: {
      type: String,
    },
    video: {
      type: String,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        text: {
          type: String,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "auth",
          required: true,
        },
        img: {
          type: String, // رابط الصورة للتعليق إن وجدت
        },
        video: {
          type: String, // رابط الفيديو للتعليق إن وجد
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
