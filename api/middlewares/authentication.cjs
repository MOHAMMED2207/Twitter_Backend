const Jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

module.exports = async (req, res, next) => {
  dotenv.config();
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  try {
    if (!token) return res.status(403).json({ error: "Access Denied" });
    let user = Jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: "Invalid JWT" });
  }
};
