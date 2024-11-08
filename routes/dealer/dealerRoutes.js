const router = require("express").Router();
const {
  getDealerName,
  getDealerById,
} = require("../../controllers/dealer/dealerController");

router.get("/dealer_name/:dealerId", getDealerName);
router.get("/dealer/:dealerNo", getDealerById);

module.exports = router;
