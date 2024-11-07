const database = require('../../database/database');

const custom_car = async (req, res) => {
  try {
    const { customer_no, car_info_no, make, model, year, car_type } = req.body;

    const result = await database.query(
      `INSERT INTO customer_car (customer_no, car_info_no, make, model, year, car_type, car_created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [customer_no, car_info_no, make, model, year, car_type]
    );

    res.status(201).json({ message: 'Customer car added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 사용자 전체 조회
const allUsers = async (req, res) => {
  try {
    // 고유id, 아이디, 이름, 이메일, 가입일자, 상태
    const result = await database.query(
      `SELECT customer_no, customer_id, customer_name, created_at, status FROM customers`
    );
    res.status(200).json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 사용자 세부 사항 조회
const detailUser = async (req, res) => {
  const { customer_id } = req.params;
  try {
    const result = await database.query(
      `SELECT * FROM customers WHERE customer_id = $1`,
      [customer_id]
    );
    if (result.rows.length > 0) {
      res.status(200).json({ user: result.rows[0] }); // 해당 사용자 정보 반환
    } else {
      res.status(404).json({ message: 'User not found' }); // 해당 사용자 없을 시
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 사용자 차량 보유 여부에 따른 정보 조회
const mycarTF = async (req, res) => {
  const { customer_no, customer_car } = req.query;

  try {
    if (customer_car === 'true') {
      // 고객이 차량을 소유하고 있는 경우 차량 정보 조회
      const carResult = await database.query(
        `SELECT make, model, year, car_type, created_at 
         FROM customer_car WHERE customer_no = $1`,
        [customer_no]
      );
      res.status(200).json({ carInfo: carResult.rows });
    } else if (customer_car === 'false') {
      // 고객이 차량을 소유하지 않은 경우 선호도 정보 조회
      const preferenceResult = await database.query(
        `SELECT preferred_make, preferred_type, created_at 
         FROM car_preference WHERE customer_no = $1`,
        [customer_no]
      );
      res.status(200).json({ preferenceInfo: preferenceResult.rows });
    } else {
      res.status(400).json({ message: 'Invalid value for customer_car' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 공지사항 추가
const addNotice = async (req, res) => {
  const { admin_id } = req.params; // URL에서 admin_id 추출
  const { notice_title, notice_content } = req.body;

  try {
    // 1. admin_id로 admin_no 조회
    const adminResult = await database.query(
      `SELECT admin_no FROM admins WHERE admin_id = $1`,
      [admin_id]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const admin_no = adminResult.rows[0].admin_no;

    // 2. 공지사항 추가
    await database.query(
      `INSERT INTO notice (admin_no, notice_title, notice_content, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [admin_no, notice_title, notice_content]
    );

    res.status(201).json({ message: 'Notice added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 공지사항 수정
const reNotice = async (req, res) => {
  const { admin_id } = req.params; // URL에서 admin_id 추출
  const { notice_title, notice_content } = req.body;

  try {
    // 1. admin_id로 admin_no 조회
    const adminResult = await database.query(
      `SELECT admin_no FROM admins WHERE admin_id = $1`,
      [admin_id]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const admin_no = adminResult.rows[0].admin_no;

    // 2. admin_no를 통해 공지사항 업데이트
    await database.query(
      `UPDATE notice 
       SET notice_title = $1, notice_content = $2, updated_at = NOW()
       WHERE admin_no = $3`,
      [notice_title, notice_content, admin_no]
    );

    res.status(200).json({ message: 'Notice updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 공지사항 삭제(상태 값 변경)
const deleteNotice = async (req, res) => {
  const { admin_id } = req.params;
  const { notice_no } = req.body; // 삭제할 notice_no를 요청 본문에서 가져옴

  try {
    // 1. admin_id로 admin_no 조회
    const adminResult = await database.query(
      `SELECT admin_no FROM admins WHERE admin_id = $1`,
      [admin_id]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const admin_no = adminResult.rows[0].admin_no;

    // 2. admin_no와 notice_no로 공지사항 상태 업데이트
    const result = await database.query(
      `UPDATE notice 
       SET notice_status = FALSE 
       WHERE admin_no = $1 AND notice_no = $2`,
      [admin_no, notice_no]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: 'Notice not found or not authorized' });
    }

    res.status(200).json({ message: 'Notice marked as deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 관리자 상담관리
const consultUsers = async (req, res) => {
  try {
    const result = await database.query(
      `SELECT 
    car_consult_custom.custom_consult_no, 
    customers.customer_name, 
    dealers.dealer_name, 
    car_consult_custom.created_at, 
    customers.status 
    FROM 
        car_consult_custom
    LEFT JOIN 
        dealers USING (custom_consult_no) 
    LEFT JOIN 
        customers USING (customer_no)
        ORDER BY custom_consult_no ASC;;
       ;`
    );
    res.status(200).json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  custom_car,
  allUsers,
  detailUser,
  mycarTF,
  addNotice,
  reNotice,
  deleteNotice,
  consultUsers,
};