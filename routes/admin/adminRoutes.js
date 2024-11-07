const router = require('express').Router();

const {
  custom_car,
  allUsers,
  detailUser,
  mycarTF,
  addNotice,
  reNotice,
  deleteNotice,
  consultUsers,
} = require('../../controllers/admin/adminController');

router.post('/custom_car', custom_car);
router.get('/all_users', allUsers);
router.get('/detail/:customer_id', detailUser);
router.get('/check_mycar', mycarTF);
router.post('/add_notice/:admin_id', addNotice);
router.patch('/re_notice/:admin_id', reNotice);
router.patch('/del_notice/:admin_id', deleteNotice);
router.get('/consult_users', consultUsers);

module.exports = router;