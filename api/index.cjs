const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { v2: cloudinary } = require("cloudinary");

const AuthRouter = require("./Routes/Auth.cjs");
const UserRouter = require("./Routes/UserAccount.cjs");
const PostsRouter = require("./Routes/Posts.cjs");
const notificationRoutes = require("./Routes/Notification.cjs");

// تهيئة إعدادات البيئة
dotenv.config();

cloudinary.config({
  cloud_name: process.env.Cloudinary_NAME,
  api_key: process.env.Cloudinary_API_KEY,
  api_secret: process.env.Cloudinary_API_SECRET,
});

// تهيئة Express
const app = express();

// المكونات الوسطى (middlewares)
// تحديد حد الحجم إلى 1GB
app.use(bodyParser.json({ limit: "1gb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


const corsOptions = {
  origin:   "https://twitter-ui-lemon.vercel.app/",
  credentials: true
};

app.use(cors(corsOptions));
// إعداد المسارات (routes)
app.use("/api", AuthRouter); // Auth
app.use("/api", UserRouter); // User
app.use("/api", PostsRouter); // Post
app.use("/api/notifications", notificationRoutes);

// الاتصال بقاعدة البيانات
const URL = process.env.MONGOO_URL;
const connect = async () => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(URL);
    console.log("connected to mongoDB");
  } catch (err) {
    console.log(err);
    process.exit();
  }
};
connect();

// تشغيل الخادم (server)
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
