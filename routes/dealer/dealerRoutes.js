const router = require("express").Router();
const {
  getDealerName,
  getDealerById,
  getDealerConsults,
  processComplete,
  addConsultMemo,
  updateConsultMemo,
  getCustomerInfo,
  getConsultDetails,
  getMemo,
} = require("../../controllers/dealer/dealerController");

router.get("/dealer_name/:dealerId", getDealerName);
router.get("/dealer/:dealerNo", getDealerById);
router.get("/dealer_consults/:dealerId", getDealerConsults);
router.put("/dealer_consults/complete/:consultNo", processComplete);
router.post("/consult_hist", addConsultMemo);
router.put("/consult_hist/:consult_hist_no", updateConsultMemo);
router.get("/customer_info/:customerNo", getCustomerInfo);
router.get("/consult_details/:consultNo", getConsultDetails);
router.get("/memo/:consultNo", getMemo);
router.put("/process_complete/:consultNo", processComplete);

module.exports = router;
