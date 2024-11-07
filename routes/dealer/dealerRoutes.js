const router = require("express").Router();
const {
  getConsultations,
  addConsultMemo,
  updateConsultMemo,
} = require("../../controllers/dealer/dealerController");

router.get("/dealer_consult", getConsultations);
router.post("/add_consult_memo", addConsultMemo);
router.put("/dealer_consult/:consult_hist_no", updateConsultMemo);

module.exports = router;