const router = require('express').Router();

const {
  custom_car,
  allUsers,
  detailUser,
  mycarTF,
  addNotice,
  reNotice,
  deleteNotice,
  getNotices,
  getConsult,
  allDealers,
  updateDealerPhone,
} = require('../../controllers/admin/adminController');

router.post('/custom_car', custom_car);
router.get('/all_users', allUsers);
router.get('/all_dealers', allDealers);
router.get('/detail/:customer_id', detailUser);
router.get('/check_mycar', mycarTF);
router.post('/add_notice', addNotice);
router.patch('/re_notice/:admin_id/:notice_no', reNotice);
router.patch('/del_notice/:admin_id/:notice_no', deleteNotice);
router.patch('/update_dealer_phone/:dealer_no', updateDealerPhone);
router.get('/admin_notices', getNotices);
router.get('/get_consult', getConsult);

module.exports = router;
