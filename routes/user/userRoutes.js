const router = require("express").Router();
const {
  signUp,
  allLogin,
  allLogout,
  findId,
  emailAuth,
  verifyNumber,
  updatePassword,
  verifyUser,
} = require("../../controllers/user/userController");

router.post("/sign_up", signUp);
router.post("/login", allLogin);
router.post("/logout", allLogout);
router.post("/find_id", findId);
router.post("/send_email", emailAuth);
router.post("/verify_email", verifyNumber);
router.post("/update_pass", updatePassword);
router.post("/verify_user", verifyUser);

module.exports = router;