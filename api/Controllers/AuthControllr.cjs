const UserModel = require("../Model/Auth.cjs");
const bcrypt = require("bcrypt");
const Jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { Domain } = require("domain");
dotenv.config();

exports.register = async function (req, res) {
  try {
    let NewUser = new UserModel(req.body); // Data From UserModel(--all data in body--)

    // ========================= Validation =========================
    let FormatEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!FormatEmail.test(req.body.email)) {
      return res.status(400).json({ error: "Invalid Email Format" });
    }

    let NoRepetUserName = await UserModel.findOne({
      username: NewUser.username,
    });
    if (NoRepetUserName) {
      return res.status(400).json({
        error: "Username is already taken",
      });
    }

    let NoRepetPhone = await UserModel.findOne({ Phone: NewUser.Phone });
    if (NoRepetPhone) {
      return res.status(400).json({
        error: "Phone is already taken",
      });
    }

    let NoRepetEmail = await UserModel.findOne({ email: NewUser.email });
    if (NoRepetEmail) {
      return res.status(400).json({
        error: "Email is already taken",
      });
    }

    // التحقق من تعقيد كلمة المرور
    if (req.body.Password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
      });
    }

    let hasUpperCase = /[A-Z]/.test(req.body.Password);
    let hasLowerCase = /[a-z]/.test(req.body.Password);
    if (!hasUpperCase || !hasLowerCase) {
      return res.status(400).json({
        error: "Password must contain both uppercase and lowercase letters",
      });
    }

    // ========================= Validation =========================
    // try catch to catch error
    const HandelPassword = await bcrypt.hash(req.body.Password, 10); // Handle password using bcrypt hash
    NewUser.Password = HandelPassword; // old Password = new hash Password
    let user = await NewUser.save(); // save user in database

    let UserRegister = {
      // obj data from user
      _id: user._id,
      fullname: user.fullname,
      username: user.username,
      Password: user.Password,
      email: user.email,
      age: user.age,
      Phone: user.Phone,
      country: user.country,
      city: user.city,
      role: user.role,
      followers: user.followers,
      following: user.following,
      ProfileImg: user.ProfileImg,
      CoverImg: user.CoverImg,
      bio: user.bio,
      link: user.link,
    };

    return res.json({
      // return res.json
      Message: "User registered successfully", //msg
      status: 200, // status is success
      user: UserRegister, // data from user
    });
  } catch (err) {
    console.log(err); // log error
    return res.status(400).send({ Message: err }); //  status(400) is a bad request , send msg
  }
};

// --------------------------------------------------------------------------------------------------------
exports.login = async function (req, res) {
  try {
    const { Password } = req.body;
    let user = await UserModel.findOne({ email: req.body.email }); // find user in database
    const isPasswordCorrect = await bcrypt.compare(
      Password,
      user?.Password || ""
    );

    if (!user || !isPasswordCorrect) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    // obj data from user becuase return this in res.json and i want to return this in userRegister
    const Token = Jwt.sign(
      {
        fullname: user.fullname,
        username: user.username,
        Password: user.Password,
        email: user.email,
        Phone: user.Phone,
        age: user.age,
        city: user.city,
        _id: user._id,
      },
      process.env.JWT_SECRET // secret key
    );

    let UserRegister = {
      // obj data from user
      fullname: user.fullname,
      username: user.username,
      Password: user.Password,
      email: user.email,
      Phone: user.Phone,
      city: user.city,
      role: user.role,
      token: Token,
    };

res.cookie("jwt", Token, {
  maxAge: 15 * 24 * 60 * 60 * 1000, // 15 يومًا بالمللي ثانية
  httpOnly: true, // يحمي من هجمات XSS
  sameSite: "strict", // يحمي من هجمات CSRF
  secure: true, // يضمن أن الكوكيز تُرسل عبر HTTPS فقط
  domain: ".vercel.app" // يسمح بالوصول إلى الكوكيز من جميع النطاقات الفرعية لـ "vercel.app"
});
  



    return res.json({
      // return user data and token
      Message: "User Login Succesfully", // msg
      status: 200, // status(200) is a ok , send msg
      user: UserRegister, // user data
    });
  } catch (err) {
    console.log(err); // log error
    return res.status(400).send({ Message: err }); // return error
  }
};

exports.logout = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.GetAllUser = async (req, res) => {
  try {
    let FilterUser = await UserModel.find(); // find user in database
    return res.json({
      // return res.json
      Message: "Data is Succesfully", //msg
      status: 200, // story is succesd
      user: FilterUser, // data from user
    });
  } catch (err) {
    console.log(err); // log error
    return res.status(400).send({ Message: err }); //  status(400) is a bad request , send msg
  }
};

exports.GetUserProfile = async (req, res) => {
  let userId = req.params.id;
  try {
    let user = await UserModel.findOne({ _id: userId }).select("-Password"); // find user in database
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      // return res.json
      Message: "Data is Succesfully", //msg
      status: 200, // story is succesd
      user: user, // data from user
    });
  } catch (err) {
    console.log(err); // log error
    return res.status(400).send({ Message: err }); //  status(400) is a bad request , send msg
  }
};
// --------------------------------------------------------------------------------------------------------
exports.getmee = async function (req, res) {
  try {
    const user = await UserModel.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.log("Error in getMe controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// --------------------------------------------------------------------------------------------------------
