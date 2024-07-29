const Express = require("express");
const UserControllr = require("../Controllers/UserControllrr.cjs");
const AUTH_MIDDLEWARES = require("../middlewares/authentication.cjs"); // Routes
const router = Express.Router();
// ------------------------------------------------------------------------------------
router.get(
  "/user/profile/:username",
  AUTH_MIDDLEWARES,
  UserControllr.getUserProfile
);
router.get(
  "/searchUsers/:username",
  AUTH_MIDDLEWARES,
  UserControllr.searchUsers
);
router.get("/user/Following/:username", AUTH_MIDDLEWARES, UserControllr.getMyFollowing);
router.get("/user/Followers/:username", AUTH_MIDDLEWARES, UserControllr.getMyFollowers);
// ------------------------------------------------------------------------------------
router.get(
  "/user/suggested",
  AUTH_MIDDLEWARES,
  UserControllr.getSuggestedUsers
);
// ------------------------------------------------------------------------------------
router.post(
  "/user/follow/:id",
  AUTH_MIDDLEWARES,
  UserControllr.followUnfollowUser
);
// ------------------------------------------------------------------------------------
router.post("/user/update", AUTH_MIDDLEWARES, UserControllr.updateUser);
// ------------------------------------------------------------------------------------

module.exports = router; //  Exports
