const Jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

module.exports = async (req, res, next) => {
  dotenv.config();
  const token =  req.cookies.jwt;
    // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmdWxsbmFtZSI6Ik1vaGFtbWVkIEFiZHVsIEZhdGFoIiwidXNlcm5hbWUiOiJNb2hhbW1lZF9PaWZmaWNhbCIsIlBhc3N3b3JkIjoiJDJiJDEwJGhQZjUvcHUuQUJRWUVYQW5aL21Bci5QaFV6Q0hoWFVKRGpKLnFpVHVJWXplQmJ0bGtlaDkuIiwiZW1haWwiOiJtb29tdWRpMjFAZ21haWwuY29tIiwiUGhvbmUiOiIwMTE1MjIzNzcxMiIsImFnZSI6MjIsImNpdHkiOiJDYWlybyIsIl9pZCI6IjY2NDIyMjhlYmY3OWRiZTRkOTNjYWRjZCIsImlhdCI6MTcyMTY2NTI4NH0.8_ikVDrqUzwxOMGCed6p2SwVIDZfjgXmqvBw0Ih1uLU"
  console.log(token);
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
