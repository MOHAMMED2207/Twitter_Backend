const NotificationModel = require("../Model/Notification.cjs");
const UserModel = require("../Model/Auth.cjs");
const PostModel = require("../Model/Posts.cjs");
const { v2: cloudinary } = require("cloudinary");

exports.createPost = async function (req, res) {
  try {
    let { img, text, video } = req.body; // إضافة حقل الفيديو
    const userId = req.user._id.toString();
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!text && !img && !video) {
      // التحقق من وجود نص أو صورة أو فيديو
      return res
        .status(400)
        .json({ error: "Post must have text, image, or video" });
    }

    if (img) {
      try {
        const uploadedResponse = await cloudinary.uploader.upload(img); // رفع الصورة
        img = uploadedResponse.secure_url;
      } catch (error) {
        return res.status(400).json({ error: "Can't upload image" });
      }
    }

    if (video) {
      try {
        const uploadedResponse = await cloudinary.uploader.upload(video, {
          resource_type: "video",
        }); // رفع الفيديو
        video = uploadedResponse.secure_url;
      } catch (error) {
        console.log(error.message);
        return res.status(400).json({ error: "Can't upload video" });
      }
    }

    const newPost = new PostModel({
      user: userId,
      text,
      img,
      video, // إضافة الفيديو إلى المنشور الجديد
    });

    await newPost.save();
    res
      .status(201)
      .json({ Message: "Posted Successfully", Status: 200, Post: newPost });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in createPost controller: ", error);
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.id);
    console.log(post);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this post" });
    }

    if (post.img) {
      const imgId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    if (post.video) {
      const videoId = post.video.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(videoId);
    }

    await PostModel.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.log("Error in deletePost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.commentOnPost = async (req, res) => {
  try {
    const { text, img, video } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await PostModel.findById(postId).populate({
      path: "user",
      select: "-email -password",
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // تحضير التعليق
    const comment = { user: userId, text };

    if (img) {
      try {
        const uploadedImage = await cloudinary.uploader.upload(img);
        comment.img = uploadedImage.secure_url;
      } catch (error) {
        return res.status(400).json({ error: "Can't upload image" });
      }
    }

    if (video) {
      try {
        const uploadedVideo = await cloudinary.uploader.upload(video, {
          resource_type: "video",
        });
        comment.video = uploadedVideo.secure_url;
      } catch (error) {
        console.log(error.message);
        return res.status(400).json({ error: "Can't upload video" });
      }
    }

    // إضافة التعليق إلى المنشور
    post.comments.push(comment);
    await post.save();

    // إرسال إشعار
    const notification = new NotificationModel({
      type: "comment",
      post: post,
      from: userId,
      to: post.user._id,
    });
    await notification.save();

    res.status(200).json(post);
  } catch (error) {
    console.log("Error in commentOnPost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.likeUnlikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    // البحث عن المنشور وتحديد البيانات المطلوب عرضها
    const post = await PostModel.findById(postId)
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-email -Password",
      });

    // التحقق من وجود المنشور
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userHasLikedPost = post.likes.includes(userId);

    if (userHasLikedPost) {
      // إذا كان المستخدم قد أعجب بالفعل بالمنشور، قم بإزالة الإعجاب
      await PostModel.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await UserModel.updateOne(
        { _id: userId },
        { $pull: { likedPosts: postId } }
      );

      const updatedLikes = post.likes.filter(
        (like) => like.toString() !== userId.toString()
      );
      res
        .status(200)
        .json({ Message: "You Unliked this Post", Likes: updatedLikes });
    } else {
      // إذا لم يكن المستخدم قد أعجب بالمنشور بعد، قم بإضافة الإعجاب
      post.likes.push(userId);
      await UserModel.updateOne(
        { _id: userId },
        { $push: { likedPosts: postId } }
      );
      await post.save();

      // إنشاء إشعار جديد
      const notification = new NotificationModel({
        type: "like",
        from: userId,
        post: postId,
        to: post.user._id,
      });
      await notification.save();

      res
        .status(200)
        .json({ Message: "Liked Successfully", Likes: post.likes });
    }
  } catch (error) {
    console.error("Error in likeUnlikePost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    const totalPosts = await PostModel.countDocuments(); // Get total number of posts

    const posts = await PostModel.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: " -email -Password",
      })
      .populate({
        path: "comments.user",
        select: " -email -Password",
      });

    res.status(200).json({ posts, totalPosts });
  } catch (error) {
    console.log("Error in getAllPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getLikedPosts = async (req, res) => {
  const username = req.params.username;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    let user = await UserModel.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const totalPosts = user.likedPosts.length; // Get total number of liked posts
    console.log(totalPosts);
    const posts = await PostModel.find({ _id: { $in: user.likedPosts } })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "-Password",
      })
      .populate({
        path: "comments.user",
        select: "-Password",
      });

    res.status(200).json({ posts, totalPosts });
  } catch (error) {
    console.log("Error in getLikedPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getFollowingPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const following = user.following;

    const totalPosts = await PostModel.countDocuments({
      user: { $in: following },
    }); // Get total number of following posts

    const posts = await PostModel.find({ user: { $in: following } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json({ posts, totalPosts });
  } catch (error) {
    console.log("Error in getFollowingPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getUserPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const { username } = req.params;

    const user = await UserModel.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const totalPosts = await PostModel.countDocuments({ user: user._id }); // Get total number of user posts

    const posts = await PostModel.find({ user: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json({ posts, totalPosts });
  } catch (error) {
    console.log("Error in getUserPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
exports.getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await PostModel.findById(postId)
      .populate({
        path: "user",
        select: "-password -email",
      })
      .populate({
        path: "comments.user",
        select: "-password -email",
      });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(post);
  } catch (error) {
    console.log("Error in getPostById controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.savePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await PostModel.findById(postId);
    const user = await UserModel.findById(userId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // التحقق مما إذا كان المستخدم قد حفظ المنشور بالفعل
    const userHasSavedPost = user.savedPosts.includes(postId);

    if (userHasSavedPost) {
      // إزالة معرف المنشور من قائمة المحفوظات لدى المستخدم
      user.savedPosts = user.savedPosts.filter(
        (id) => id.toString() !== postId.toString()
      );
      await user.save();

      // إزالة معرف المستخدم من قائمة المحفوظات في المنشور
      post.savedBy = post.savedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      await post.save();

      return res.status(200).json({ message: "Post unsaved successfully" });
    }

    // إذا لم يكن المستخدم قد حفظ المنشور، أضف معرف المنشور إلى قائمة المحفوظات
    user.savedPosts.push(postId);
    await user.save();

    // إضافة معرف المستخدم إلى قائمة المحفوظات في المنشور
    post.savedBy.push(userId);
    await post.save();

    res.status(200).json({ message: "Post saved successfully" });
  } catch (error) {
    console.error("Error saving post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
