const database = require("../../database/database"); // database 가져오기
const nodemailer = require("nodemailer"); // nodemailer
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

dotenv.config();

// 회원 가입
const signUp = async (req, res) => {
  try {
    const {
      customer_id,
      customer_pw,
      customer_email,
      customer_name,
      customer_phone,
      customer_gender,
      customer_birth, // 생년월일 (연도)
      customer_city, // 도시
    } = req.body;

    // 이메일 중복 검사
    const emailCheck = await database.query(
      `SELECT * FROM customers WHERE customer_email = $1`,
      [customer_email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
    }

    // 아이디 중복 검사
    const idCheck = await database.query(
      `SELECT * FROM customers WHERE customer_id = $1`,
      [customer_id]
    );
    if (idCheck.rows.length > 0) {
      return res.status(400).json({ message: "이미 사용 중인 아이디입니다." });
    }

    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(customer_pw, salt);

    // 고객 정보 삽입 및 customer_no 반환
    const customerResult = await database.query(
      `INSERT INTO customers 
      (customer_id, customer_pw, customer_email, customer_name, customer_phone, 
      customer_gender, customer_birth, customer_city) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING customer_no`,
      [
        customer_id,
        hash,
        customer_email,
        customer_name,
        customer_phone,
        customer_gender,
        customer_birth, // 연도만 저장
        customer_city, // 도시 저장
      ]
    );

    const customer_no = customerResult.rows[0].customer_no;

    res.status(201).json({
      message: "회원 가입을 완료하였습니다.",
      customer_no,
    });
  } catch (error) {
    console.error("Error inserting data:", error.message); // 오류 로그 추가
    res.status(500).json({ error: error.message });
  }
};

const allLogin = async (req, res) => {
  const { username, password, userType } = req.body;

  try {
    // Define table and field names based on user type
    let tableName, idField, pwField, isPasswordEncrypted;
    if (userType === "customer") {
      tableName = "customers";
      idField = "customer_id";
      pwField = "customer_pw";
      isPasswordEncrypted = true;
    } else if (userType === "dealer") {
      tableName = "dealers";
      idField = "dealer_id";
      pwField = "dealer_pw";
      isPasswordEncrypted = false;
    } else if (userType === "admin") {
      tableName = "admins";
      idField = "admin_id";
      pwField = "admin_pw";
      isPasswordEncrypted = false;
    } else {
      return res
        .status(400)
        .json({ message: "유효하지 않은 로그인 유형입니다." });
    }

    // Fetch user info from the database
    const result = await database.query(
      `SELECT * FROM ${tableName} WHERE ${idField} = $1`,
      [username]
    );
    const user = result.rows[0];

    // Validate user existence
    if (!user) {
      return res.status(401).json({ message: "아이디가 존재하지 않습니다." });
    }

    // Validate password
    if (isPasswordEncrypted) {
      const isPasswordMatch = await bcrypt.compare(password, user[pwField]);
      if (!isPasswordMatch) {
        return res.status(401).json({ message: "비밀번호가 맞지 않습니다." });
      }
    } else {
      if (password !== user[pwField]) {
        return res.status(401).json({ message: "비밀번호가 맞지 않습니다." });
      }
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user[idField], userType },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    // Send token, userId, and userType back to the client
    return res.json({
      message: `${
        userType === "customer"
          ? "고객님"
          : userType === "dealer"
          ? "딜러님"
          : "관리자님"
      } 로그인 하였습니다.`,
      token,
      userId: user[idField],
      userType,
    });
  } catch (error) {
    console.error("서버 오류:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// 고객, 딜러, 관리자 로그 아웃
const allLogout = async (req, res) => {
  const { userType } = req.body; // 로그아웃 요청에서 userType 가져오기

  // 쿠키 삭제
  res.clearCookie("isLoggedIn"); // 쿠키에서 로그인 상태 제거

  // 역할별 응답 메시지 설정
  let message = "로그아웃 되었습니다.";
  if (userType === "customer") {
    message = "고객님, 로그아웃 되었습니다.";
  } else if (userType === "dealer") {
    message = "딜러님, 로그아웃 되었습니다.";
  } else if (userType === "admin") {
    message = "관리자님, 로그아웃 되었습니다.";
  }

  return res.json({ message });
};

// 아이디 찾기
const findId = async (req, res) => {
  const { customer_name, customer_email } = req.body;

  if (!customer_name || !customer_email) {
    return res
      .status(400)
      .json({ message: "이름과 이메일을 모두 입력해주세요." });
  }

  try {
    const nameResult = await database.query(
      "SELECT customer_id, customer_email FROM customers WHERE customer_name = $1",
      [customer_name]
    );

    if (nameResult.rows.length === 0) {
      return res.status(404).json({ message: "일치하는 이름이 없습니다." });
    }

    const user = nameResult.rows.find(
      (user) => user.customer_email === customer_email
    );

    if (user) {
      return res.json({
        message: "아이디 찾기에 성공했습니다.",
        userId: user.customer_id,
      });
    } else {
      return res
        .status(404)
        .json({ message: "이름은 일치하나 이메일이 일치하지 않습니다." });
    }
  } catch (error) {
    console.error("DB 에러:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// 이메일 인증 구현
const smtpTransporter = nodemailer.createTransport({
  host: "smtp.naver.com", // naver smtp 사용
  port: 587, // 포트 587
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER, // 사용자 이메일
    pass: process.env.EMAIL_PASS, // 사용자 이메일 비밀번호
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const authNumbers = {}; // 인증번호 보관

const emailAuth = async (req, res) => {
  const email = req.body.customor_email;
  // 6자리 랜덤 인증번호 생성
  const emailRandomNumber = Math.floor(Math.random() * 899999) + 100000;
  console.log("생성된 인증번호:", emailRandomNumber);

  const mailOption = {
    from: process.env.EMAIL_USER, // 발신자 이메일
    to: email, // 수신자 이메일
    subject: "카봇 이메일 인증",
    html: `<h1>인증번호를 입력하세요:</h1> <p>${emailRandomNumber}</p>`,
  };

  smtpTransporter.sendMail(mailOption, (error, info) => {
    if (error) {
      console.log("이메일 전송 오류:", error);
      res.status(500).send("메일 전송 실패");
    } else {
      console.log("메일 전송 성공:", info.response);
      res.status(200).send("메일 전송 성공");
      authNumbers[email] = {
        code: emailRandomNumber,
        expires: Date.now() + 5 * 60000,
      }; // 인증번호 5분 유지
    }
  });
};

const verifyNumber = (req, res) => {
  const { email, code } = req.body; // code가 요청에서 제대로 전달되었는지 확인

  if (!authNumbers[email]) {
    return res.status(400).send("인증번호가 존재하지 않거나 만료되었습니다.");
  }

  // 인증번호 만료 확인
  if (Date.now() > authNumbers[email].expires) {
    delete authNumbers[email];
    return res.status(400).send("인증번호가 만료되었습니다.");
  }

  // 인증번호 일치 여부 확인
  if (String(authNumbers[email].code) === String(code)) {
    delete authNumbers[email];
    return res.status(200).send("인증 성공");
  } else {
    return res.status(400).send("인증번호가 일치하지 않습니다.");
  }
};

// 비밀번호 찾기 하기 전 아이디 이메일 확인
const verifyUser = async (req, res) => {
  const { customer_id, customer_email } = req.body;
  const checking = `SELECT * FROM customers WHERE customer_id = $1 AND customer_email = $2`;
  const values = [customer_id, customer_email];

  try {
    const { rows } = await database.query(checking, values);

    if (rows.length > 0) {
      return res.status(200).json({ success: true, user: rows[0] });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "사용자 ID를 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "서버 오류가 났습니다." });
  }
};

// 비밀번호 찾기
const updatePassword = async (req, res) => {
  const { new_password, customer_id } = req.body; // 요청 본문에서 데이터 추출

  try {
    const salt = 10;
    const newhashedPassword = await bcrypt.hash(new_password, salt); // 비밀번호 해시화

    // 데이터베이스 쿼리
    const changes = `UPDATE customers SET customer_pw = $1, updated_at = NOW() WHERE customer_id = $2`;
    const pw_values = [newhashedPassword, customer_id];
    await database.query(changes, pw_values);

    // 응답으로 성공 메시지 반환
    res
      .status(200)
      .json({ success: true, message: "패스워드를 업데이트 하였습니다." });
  } catch (error) {
    console.error("Error:", error); // 오류 로깅
    res.status(500).json({ success: false, message: "서버 오류가 났습니다." });
  }
};

// 회원정보 수정 비밀번호 확인
const cumstomEdit = async (req, res) => {
  const { storeadUserId, password } = req.body;

  const tableName = "customers";
  const idField = "customer_id";
  const pwField = "customer_pw";
  const isPasswordEncrypted = true;

  try {
    const result = await database.query(
      `SELECT * FROM ${tableName} WHERE ${idField} = $1`,
      [storeadUserId]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "아이디가 존재하지 않습니다." });
    }

    // 비밀번호 검증
    if (isPasswordEncrypted) {
      const isPasswordMatch = await bcrypt.compare(password, user[pwField]);
      if (!isPasswordMatch) {
        return res.status(401).json({ message: "비밀번호가 맞지 않습니다." });
      }
    } else {
      if (password !== user[pwField]) {
        return res.status(401).json({ message: "비밀번호가 맞지 않습니다." });
      }
    }

    return res.json({
      message: "비밀번호가 확인되었습니다.",
      userId: user[idField],
    });
  } catch (error) {
    console.error("서버 오류:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// 마이페이지 회원정보 가져오기
const getUserEmail = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await database.query(
      `SELECT customer_email, customer_id FROM customers WHERE customer_id = $1`,
      [userId]
    );
    if (result.rows.length > 0) {
      const userEmail = result.rows[0].customer_email;
      const userId = result.rows[0].customer_id;
      res.status(200).json({ success: true, email: userEmail, userId: userId });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 마이페이지 구매 상담 신청
const submitConsultRequest = async (req, res) => {
  const { userId, consult_content } = req.body;

  // 유효성 검사: 필수 데이터가 있는지 확인
  if (!userId || !consult_content) {
    console.log("Invalid request body:", req.body); // 유효성 검사 실패 시 body 출력
    return res
      .status(400)
      .json({ error: "userId와 consult_content는 필수 항목입니다." });
  }

  try {
    // 1. userId로 customer_no 조회
    console.log("Looking up customer_no for userId:", userId); // userId 출력
    const customerResult = await database.query(
      `SELECT customer_no FROM customers WHERE customer_id = $1 AND status = true`,
      [userId]
    );

    // 고객이 없을 경우 에러 반환
    if (customerResult.rows.length === 0) {
      console.log("No customer found for userId:", userId); // 조회 결과 없음
      return res
        .status(404)
        .json({ error: "해당 userId를 가진 고객을 찾을 수 없습니다." });
    }

    const customer_no = customerResult.rows[0].customer_no;
    console.log("Found customer_no:", customer_no); // 조회된 customer_no 출력

    // 2. car_consult_custom에 consult_content 삽입
    console.log("Inserting consult_content for customer_no:", customer_no);
    const insertResult = await database.query(
      `INSERT INTO car_consult_custom (customer_no, custom_content)
       VALUES ($1, $2)
       RETURNING *`,
      [customer_no, consult_content]
    );

    console.log("Insert successful:", insertResult.rows[0]); // 삽입된 데이터 출력

    // 3. 삽입된 데이터 반환
    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error("Error submitting consult request:", error); // 에러 로그 출력
    res
      .status(500)
      .json({ error: "구매 상담 신청 처리 중 오류가 발생했습니다." });
  }
};

// 마이페이지 내 상담 내역 조회
const getCustomerConsult = async (req, res) => {
  const { userId } = req.params; // userId를 요청 파라미터로 받음

  try {
    // 1. userId로 customer_no 조회
    const customerResult = await database.query(
      `SELECT customer_no FROM customers WHERE customer_id = $1`,
      [userId]
    );

    if (customerResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "해당 userId를 가진 고객이 없습니다." });
    }

    const customerNo = customerResult.rows[0].customer_no;

    // 2. customer_no로 car_consult_custom 테이블 데이터 조회
    const consultationsResult = await database.query(
      `SELECT custom_consult_no, created_at, consult_process 
       FROM car_consult_custom 
       WHERE customer_no = $1`,
      [customerNo]
    );

    if (consultationsResult.rows.length === 0) {
      return res.json([]); // 데이터가 없는 경우 빈 배열 반환
    }

    // 3. 데이터 가공
    const consultations = consultationsResult.rows.map((row, index) => ({
      no: index + 1, // 번호
      car_model: "GV80 coupe", // 차량 모델 (통일된 값)
      dealer_name: "김준호 딜러", // 담당자 (통일된 값)
      created_at: new Date(row.created_at).toLocaleDateString(), // 신청 날짜
      consult_process: row.consult_process, // 상태
    }));

    return res.json(consultations); // 결과 반환
  } catch (error) {
    console.error("Error fetching consultations:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 공지사항 조회
const getUserNotices = async (req, res) => {
  try {
    const result = await database.query(
      `SELECT notice_no, notice_title, notice_content, created_at, notice_category
       FROM notice
       WHERE status = true
       ORDER BY created_at DESC`
    );

    if (result.rows.length > 0) {
      res.status(200).json({ success: true, notices: result.rows });
    } else {
      res.status(404).json({ success: false, message: "공지사항이 없습니다." });
    }
  } catch (error) {
    console.error("Database error:", error);
    res
      .status(500)
      .json({ success: false, message: "데이터베이스 오류가 발생했습니다." });
  }
};

module.exports = {
  signUp,
  allLogin,
  allLogout,
  findId,
  emailAuth,
  verifyNumber,
  verifyUser,
  updatePassword,
  submitConsultRequest,
  getCustomerConsult,
  getUserEmail,
  cumstomEdit,
  getUserNotices,
};
