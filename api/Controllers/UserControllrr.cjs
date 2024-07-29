const UserModel = require("../Model/Auth.cjs");
const NotificationModel = require("../Model/Notification.cjs");
const bcrypt = require("bcrypt");
const { v2: cloudinary } = require("cloudinary");

exports.getUserProfile = async function (req, res) {
  try {
    const { username } = req.params;

    const user = await UserModel.findOne({ username }).select("-Password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    console.log(err); // log error
    return res.status(400).send({ Message: err }); // return error
  }
};

exports.getSuggestedUsers = async function (req, res) {
  try {
    const userId = req.user._id;

    // الحصول على قائمة المتابعين الذين يتابعهم المستخدم الحالي
    const user = await UserModel.findById(userId).select("following").lean();
    const followingIds = user.following.map((followingId) =>
      followingId.toString()
    );

    const users = await UserModel.find({ _id: { $ne: userId } }).lean();

    // تصفية المستخدمين لاستبعاد الذين يتابعهم المستخدم الحالي
    const filteredUsers = users.filter(
      (user) => !followingIds.includes(user._id.toString())
    );

    // إزالة كلمة المرور من النتائج
    filteredUsers.forEach((user) => {
      user.Password = undefined;
    });

    // دالة لتوزيع القائمة عشوائيًا
    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    // توزيع القائمة عشوائيًا واختيار أول 6 مستخدمين
    const shuffledUsers = shuffle(filteredUsers);
    const suggestedUsers = shuffledUsers.slice(0, 6);

    res.status(200).json(suggestedUsers);
  } catch (error) {
    console.log("Error in getSuggestedUsers: ", error.message);
    res.status(500).json({ error: error.message });
  }
};
exports.searchUsers = async function (req, res) {
  try {
    const searchTerm = req.params.username; // استخراج المصطلح من الوسم `:username` في التوجيه

    if (!searchTerm) {
      return res.status(400).json({ error: "Search term is required" });
    }

    const regex = new RegExp(`^${searchTerm}`, "i"); // تعبير منتظم غير حساس لحالة الأحرف ويبدأ بالمصطلح

    const users = await UserModel.find({
      $or: [{ username: regex }, { fullname: regex }],
    }).limit(10);

    users.forEach((user) => {
      user.Password = undefined; // إزالة كلمة المرور من النتائج
    });

    res.status(200).json(users);
  } catch (error) {
    console.log("Error in searchUsers:", error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getMyFollowing = async function (req, res) {
  try {
    const username = req.params.username;

    // الحصول على قائمة المتابعين الذين يتابعهم المستخدم الحالي
    const user = await UserModel.findOne({ username })
      .select("following")
      .populate("following", "username fullname ProfileImg");
    res.status(200).json(user);
  } catch (error) {
    console.log("Error in getSuggestedUsers: ", error.message);
    res.status(500).json({ error: error.message });
  }
};
exports.getMyFollowers = async function (req, res) {
  try {
    const username = req.params.username;

    // الحصول على قائمة المتابعين الذين يتابعهم المستخدم الحالي
    const user = await UserModel.findOne({ username })
      .select("followers")
      .populate("followers", "username fullname ProfileImg");
    console.log(user);
    res.status(200).json(user);
  } catch (error) {
    console.log("Error in getSuggestedUsers: ", error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.followUnfollowUser = async function (req, res) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const userToModify = await UserModel.findById(id);
    const currentUser = await UserModel.findById(currentUserId);

    if (!userToModify || !currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (id === currentUserId.toString()) {
      return res
        .status(400)
        .json({ error: "You can't follow/unfollow yourself" });
    }

    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      // Unfollow the user
      await UserModel.findByIdAndUpdate(id, {
        $pull: { followers: currentUserId },
      });
      await UserModel.findByIdAndUpdate(currentUserId, {
        $pull: { following: id },
      });
      res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      // Follow the user
      await UserModel.findByIdAndUpdate(id, {
        $push: { followers: currentUserId },
      });
      await UserModel.findByIdAndUpdate(currentUserId, {
        $push: { following: id },
      });

      // Create notification

      const notification = new NotificationModel({
        type: "follow",
        from: currentUserId,
        to: id,
      });
      await notification.save();

      res.status(200).json({ message: "User followed successfully" });
    }
  } catch (err) {
    console.error("Error in followUnfollowUser:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateUser = async (req, res) => {
  const { fullname, email, username, currentPassword, newPassword, bio, link } =
    req.body;
  let { profileImg, coverImg } = req.body;

  const userId = req.user._id;

  try {
    let user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (
      (!newPassword && currentPassword) ||
      (!currentPassword && newPassword)
    ) {
      return res.status(400).json({
        error: "Please provide both current password and new password",
      });
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.Password);
      if (!isMatch)
        return res.status(400).json({ error: "Current password is incorrect" });
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long" });
      }

      const salt = await bcrypt.genSalt(10); 
      user.Password = await bcrypt.hash(newPassword, salt);
    }

    if (profileImg) {
      if (user.ProfileImg) {
        await cloudinary.uploader.destroy(
          user.ProfileImg.split("/").pop().split(".")[0]
        );
      }

      const uploadedResponse = await cloudinary.uploader.upload(profileImg);
      profileImg = uploadedResponse.secure_url;
    }

    if (coverImg) {
      if (user.CoverImg) {
        await cloudinary.uploader.destroy(
          user.CoverImg.split("/").pop().split(".")[0]
        );
      }

      const uploadedResponse = await cloudinary.uploader.upload(coverImg);
      coverImg = uploadedResponse.secure_url;
    }

    user.fullname = fullname || user.fullname;
    user.email = email || user.email;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    user.link = link || user.link;
    user.ProfileImg = profileImg || user.ProfileImg;
    user.CoverImg = coverImg || user.CoverImg;

    user = await user.save();

    // password should be null in response
    user.Password = null;

    return res.status(200).json(user);
  } catch (error) {
    console.log("Error in updateUser: ", error.message);
    res.status(500).json({ error: error.message });
  }
};
