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
  const { admin_id, notice_title, notice_category, notice_content } = req.body;
  console.log('Received data:', req.body); // 디버깅용 로그 추가

  try {
    // admin_id로 admin_no 조회
    const adminResult = await database.query(
      `SELECT admin_no FROM admins WHERE admin_id = $1 AND status = TRUE`,
      [admin_id]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const admin_no = adminResult.rows[0].admin_no;

    // 공지사항 추가
    await database.query(
      `INSERT INTO notice (admin_no, notice_title, notice_category, notice_content, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [admin_no, notice_title, notice_category, notice_content]
    );

    res.status(201).json({ message: 'Notice added successfully' });
  } catch (error) {
    console.error('Error adding notice:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 공지사항 수정
const reNotice = async (req, res) => {
  const { admin_id, notice_no } = req.params; // URL 파라미터에서 admin_id와 notice_no 추출
  const { notice_title, notice_content, notice_category } = req.body; // 요청 본문에서 데이터 추출

  // 필수 필드 확인
  if (!notice_title || !notice_content || !notice_category) {
    return res.status(400).json({
      message:
        '필수 항목이 누락되었습니다. notice_title, notice_content, notice_category를 모두 제공해야 합니다.',
    });
  }

  try {
    // admin_id로 admin_no와 userType 조회
    const adminResult = await database.query(
      `SELECT admin_no FROM admins WHERE admin_id = $1 AND status = TRUE`,
      [admin_id]
    );

    if (adminResult.rows.length === 0) {
      return res
        .status(403)
        .json({ message: '관리자 권한이 없거나 존재하지 않는 관리자입니다.' });
    }

    const admin_no = adminResult.rows[0].admin_no;

    // 공지사항 수정
    const result = await database.query(
      `UPDATE notice 
       SET notice_title = $1, notice_content = $2, notice_category = $3, updated_at = NOW()
       WHERE admin_no = $4 AND notice_no = $5`,
      [notice_title, notice_content, notice_category, admin_no, notice_no]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: 'Notice not found or not authorized' });
    }

    res.status(200).json({ message: 'Notice updated successfully' });
  } catch (error) {
    console.error('Error updating notice:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 공지사항 삭제(상태 값 변경)
const deleteNotice = async (req, res) => {
  const { admin_id, notice_no } = req.params; // URL 파라미터에서 admin_id와 notice_no 추출

  try {
    // admin_id로 admin_no 조회
    const adminResult = await database.query(
      `SELECT admin_no FROM admins WHERE admin_id = $1 AND status = TRUE`,
      [admin_id]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const admin_no = adminResult.rows[0].admin_no;

    // 공지사항 삭제 (상태 변경)
    const result = await database.query(
      `UPDATE notice 
       SET status = FALSE 
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
    console.error('Error deleting notice:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 관리자 공지사항 조회
const getNotices = async (req, res) => {
  try {
    const result = await database.query(
      `SELECT 
        notice.notice_no, 
        notice.notice_title,
        notice.notice_content,
        notice.notice_category,
        admins.admin_id AS admin_name,
        notice.created_at
      FROM 
        notice
      JOIN 
        admins 
      ON 
        notice.admin_no = admins.admin_no
      WHERE 
        notice.status = TRUE
      ORDER BY 
        notice.created_at DESC;`
    );

    res.status(200).json({ notices: result.rows });
  } catch (error) {
    console.error('Error fetching notices:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 관리자 상담 내역 조회
const getConsult = async (req, res) => {
  try {
    const query = `
      SELECT 
          ccc.custom_consult_no,
          cust.customer_name,
          dlr.dealer_name,
          ch.consult_content,
          COALESCE(ch.created_at, ccc.created_at) AS created_at 
      FROM car_consult_custom ccc
      LEFT JOIN customers cust ON ccc.customer_no = cust.customer_no
      LEFT JOIN dealers dlr ON ccc.dealer_no = dlr.dealer_no
      LEFT JOIN consult_hist ch ON ccc.custom_consult_no = ch.custom_consult_no
      WHERE ccc.status = TRUE
      ORDER BY created_at DESC;
    `;
    const result = await database.query(query);

    // 추가 데이터 변환 (예: 기본값 설정)
    const consultations = result.rows.map((row) => ({
      ...row,
      created_at: row.created_at || new Date(0).toISOString(), // 기본값: 1970-01-01T00:00:00.000Z
    }));

    res.status(200).json(consultations);
  } catch (error) {
    console.error('Error fetching consultations:', error);
    res
      .status(500)
      .json({ error: '상담 목록을 가져오는 중 오류가 발생했습니다.' });
  }
};

// 딜러 관리
const allDealers = async (req, res) => {
  try {
    const result = await database.query(
      `SELECT dealer_no, dealer_id, dealer_name, dealer_phone, created_at, status 
      FROM dealers
      ORDER BY updated_at DESC;`
    );
    res.status(200).json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 딜러 정보 수정 - 아이디와 핸드폰 번호
const updateDealerInfo = async (req, res) => {
  const { dealer_no } = req.params; // 딜러 번호로 식별
  const { dealer_phone, dealer_id } = req.body; // 새로운 핸드폰 번호와 아이디

  try {
    const result = await database.query(
      `UPDATE dealers 
       SET dealer_phone = $1, dealer_id = $2 
       WHERE dealer_no = $3 
       RETURNING dealer_no, dealer_id, dealer_phone, dealer_name, status`,
      [dealer_phone, dealer_id, dealer_no]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    res.status(200).json({
      message: 'Dealer info updated successfully',
      dealer: result.rows[0], // 변경된 딜러 정보를 반환
    });
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
  getNotices,
  getConsult,
  allDealers,
  updateDealerInfo,
};
