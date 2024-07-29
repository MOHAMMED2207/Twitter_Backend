const Notification = require("../Model/Notification.cjs");

exports.getNotifications = async function (req, res) {
  try {
    const userId = req.user._id;

    // All notifications sent to me
    const notifications = await Notification.find({ to: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "from",
      })
      .populate({
        path: "post",
        populate: {
          path: "user", // Assuming `user` is a field inside `post` that references a User document
          model: "auth", // Specify the model name explicitly
        },
      });

    res.status(200).json(notifications);
  } catch (error) {
    console.log("Error in getNotifications function", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.readablNotifcation = async function (req, res) {
  try {
    const userId = req.user._id;

    // Update all notifications sent to me to read: true
    await Notification.updateMany({ to: userId }, { read: true });

    // Retrieve all notifications sent to me
    const notifications = await Notification.find({ to: userId });

    res.status(200).json(notifications);
  } catch (error) {
    console.log("Error in readablNotifcation function", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getLatestUnreadNotification = async function (req, res) {
  try {
    const userId = req.user._id;

    const latestUnreadNotification = await Notification.findOne({
      to: userId,
      read: false,
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "from",
      })
      .populate({
        path: "post",
        populate: {
          path: "user",
          model: "auth",
        },
      });

    if (!latestUnreadNotification) {
      return res.status(404).json({ error: "No unread notifications found" });
    }

    res.status(200).json(latestUnreadNotification);
  } catch (error) {
    console.error(
      "Error in getLatestUnreadNotification function",
      error.message
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.deleteNotifications = async function (req, res) {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({ to: userId });

    res.status(200).json({ message: "Notifications deleted successfully" });
  } catch (error) {
    console.log("Error in deleteNotifications function", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.DeletePostNotifications = async function (req, res) {
  try {
    const { postId } = req.params;
    await Notification.deleteMany({ post: postId });
    res.status(200).json({ message: "Notifications deleted successfully" });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
