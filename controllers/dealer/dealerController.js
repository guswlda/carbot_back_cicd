const database = require("../../database/database");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");

dotenv.config();

// front의 dealerId를 이용해서 딜러 이름 가져오기
const getDealerName = async (req, res) => {
  const { dealerId } = req.params; // URL에서 dealerId 가져오기

  try {
    const dealerResult = await database.query(
      `SELECT dealer_name, dealer_no FROM dealers WHERE dealer_id = $1 AND status = true`,
      [dealerId]
    );

    if (dealerResult.rows.length === 0) {
      return res.status(404).json({ error: "해당 딜러를 찾을 수 없습니다." });
    }

    res.json({
      dealerName: dealerResult.rows[0].dealer_name,
      dealerNo: dealerResult.rows[0].dealer_no,
    });
  } catch (error) {
    console.error("Error fetching dealer name:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// dealer_no를 이용해서 dealer_name 가져오기
const getDealerById = async (req, res) => {
  const dealerNo = req.params.dealerNo; // URL 파라미터에서 dealerNo 가져오기

  try {
    const result = await database.query(
      `SELECT dealer_name FROM dealers WHERE dealer_no = $1 AND status = true`,
      [dealerNo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "해당 딜러를 찾을 수 없습니다." });
    }

    res.json({ dealerName: result.rows[0].dealer_name });
  } catch (error) {
    console.error("Error fetching dealer:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 딜러의 상담 목록 가져오기
const getDealerConsults = async (req, res) => {
  try {
    const { dealerId } = req.params; // URL에서 dealerId 가져오기

    const query = `
      SELECT 
        ccc.custom_consult_no,
        ccc.custom_content,
        ccc.consult_process,
        ccc.created_at,
        cust.customer_name
      FROM car_consult_custom ccc
      JOIN customers cust
      ON ccc.customer_no = cust.customer_no
      WHERE ccc.dealer_no = $1
      ORDER BY ccc.updated_at DESC;
    `;

    const result = await database.query(query, [dealerId]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "해당 딜러의 상담 내역이 없습니다." });
    }

    res.json(result.rows); // 데이터를 클라이언트에 반환
  } catch (error) {
    console.error("Error fetching dealer consults:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// car_consult_customer의 consult_process를 '상담 시작 전'에서 '상담 완료'로 UPDATE
const processComplete = async (req, res) => {
  const { consultNo } = req.params;

  try {
    console.log("Updating counsult process for : ", consultNo);
    const query = `
      UPDATE car_consult_custom
      SET consult_process = '상담 완료'
      WHERE custom_consult_no=$1 AND consult_process = '상담 시작 전'
      RETURNING *
    `;

    const result = await database.query(query, [consultNo]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "해당 상담 내역을 찾을 수 없거나 이미 완료된 상태입니다.",
      });
    }

    res.json({
      message: "상담 상태가 '상담 완료'로 성공적으로 변경되었습니다.",
      updated: result.rows[0],
    });
  } catch (error) {
    console.error("Error marking consult as complete:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 상담 메모 등록
const addConsultMemo = async (req, res) => {
  const { custom_consult_no, consult_content } = req.body;

  try {
    const query = `
      INSERT INTO consult_hist (custom_consult_no, consult_content, status, created_at, updated_at)
      VALUES ($1, $2, true, NOW(), NOW())
      RETURNING *;
    `;
    const result = await database.query(query, [
      custom_consult_no,
      consult_content,
    ]);

    res.status(201).json({
      message: "상담 메모가 성공적으로 등록되었습니다.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error adding consult memo:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 상담 메모 수정
const updateConsultMemo = async (req, res) => {
  const { consult_hist_no } = req.params;
  const { consult_content } = req.body;

  try {
    const query = `
      UPDATE consult_hist
      SET consult_content = $1, updated_at = NOW()
      WHERE consult_hist_no = $2
      RETURNING *;
    `;
    const result = await database.query(query, [
      consult_content,
      consult_hist_no,
    ]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "해당 상담 메모를 찾을 수 없습니다." });
    }

    res.status(200).json({
      message: "상담 메모가 성공적으로 수정되었습니다.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating consult memo:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 상담 메모 - 회원 정보(이름, 전화번호, 성별) 조회
const getCustomerInfo = async (req, res) => {
  const { customerNo } = req.params; // URL 파라미터에서 customerNo 가져오기

  try {
    const query = `
      SELECT customer_name, customer_phone, customer_gender
      FROM customers
      WHERE customer_no = $1 AND status = true; -- 활성 사용자만 조회
    `;

    const result = await database.query(query, [customerNo]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "해당 사용자를 찾을 수 없습니다." });
    }

    res.json({
      customerName: result.rows[0].customer_name,
      customerPhone: result.rows[0].customer_phone,
      customerGender: result.rows[0].customer_gender,
    });
  } catch (error) {
    console.error("Error fetching customer info:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 고객 요청사항(custom_content) 및 신청자 정보(customer_name) 가져오기
const getConsultDetails = async (req, res) => {
  const { consultNo } = req.params;

  try {
    const query = `
      SELECT 
        ccc.custom_consult_no,
        ccc.custom_content,
        cust.customer_name,
        cust.customer_phone,
        cust.customer_gender
      FROM car_consult_custom ccc
      JOIN customers cust
      ON ccc.customer_no = cust.customer_no
      WHERE ccc.custom_consult_no = $1;
    `;

    const result = await database.query(query, [consultNo]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "해당 상담 내역을 찾을 수 없습니다." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching consult details:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 기존 메모 가져오기
const getMemo = async (req, res) => {
  const { consultNo } = req.params;

  try {
    const query = `
      SELECT consult_hist_no, consult_content
      FROM consult_hist
      WHERE custom_consult_no = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const result = await database.query(query, [consultNo]);

    if (result.rows.length === 0) {
      // 메모가 없는 경우
      return res.status(200).json({
        consultContent: "",
        consult_hist_no: null,
      });
    }

    // 메모가 있는 경우
    res.status(200).json({
      consultContent: result.rows[0].consult_content,
      consult_hist_no: result.rows[0].consult_hist_no,
    });
  } catch (error) {
    console.error("Error fetching memo:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

module.exports = {
  getDealerName,
  getDealerById,
  getDealerConsults,
  processComplete,
  addConsultMemo,
  updateConsultMemo,
  getCustomerInfo,
  getConsultDetails,
  getMemo,
};
