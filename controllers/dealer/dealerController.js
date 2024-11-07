const database = require("../../database/database");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");

dotenv.config();

// 상담 내역 조회
const getConsultations = async (req, res) => {
  try {
    const result = await database.query(
      `SELECT custom_consult_no, customer_no, custom_content, consult_process, car_consult_status, created_at, updated_at
       FROM car_consult_custom
       ORDER BY created_at DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error retrieving consultations:", error);
    res.status(500).json({ error: "Failed to retrieve consultations" });
  }
};

// 상담 메모 등록 (consult_hist 테이블에 저장)
const addConsultMemo = async (req, res) => {
  const { consult_content, consult_hist_status, custom_consult_no } = req.body;
  try {
    const result = await database.query(
      `INSERT INTO consult_hist (consult_content, consult_hist_status, custom_consult_no, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [consult_content, consult_hist_status, custom_consult_no]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding consultation memo:", error);
    res.status(500).json({ error: "Failed to add consultation memo" });
  }
};

// 상담 메모 수정 (consult_hist 테이블에 consult_content 업데이트)
const updateConsultMemo = async (req, res) => {
  const { consult_hist_no } = req.params; // URL에서 consult_hist_no 가져오기
  const { consult_content } = req.body; // 요청 본문에서 consult_content 가져오기

  try {
    const result = await database.query(
      `UPDATE consult_hist
       SET consult_content = $1, updated_at = NOW()
       WHERE consult_hist_no = $2
       RETURNING *`,
      [consult_content, consult_hist_no]
    );

    if (result.rowCount === 0) {
      // 업데이트할 항목이 없는 경우
      return res.status(404).json({ error: "Consultation memo not found" });
    }

    res.status(200).json(result.rows[0]); // 업데이트된 행 반환
  } catch (error) {
    console.error("Error updating consultation memo:", error);
    res.status(500).json({ error: "Failed to update consultation memo" });
  }
};

module.exports = {
  getConsultations,
  addConsultMemo,
  updateConsultMemo,
};