const Express = require("express");
const AuthControllr = require("../Controllers/AuthControllr.cjs");
const AUTH_MIDDLEWARES = require("../middlewares/authentication.cjs"); // Routes
const router = Express.Router(); // Routes

router.get("/auth/register", AuthControllr.GetAllUser); //
// ...........................................................................................................
router.get(
  "/auth/register/:id",
  AUTH_MIDDLEWARES,
  AuthControllr.GetUserProfile
); //
router.post("/auth/register", AuthControllr.register); //
// ...........................................................................................................
router.post("/auth/login", AuthControllr.login); //
// ...........................................................................................................
router.post("/auth/logout", AuthControllr.logout); //
// ...........................................................................................................
router.get("/auth/me", AUTH_MIDDLEWARES , AuthControllr.getmee); //
// ...........................................................................................................
module.exports = router; //  Exports
