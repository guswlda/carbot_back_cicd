const database = require("../../database/database");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");

dotenv.config();

// front의 dealerId를 이용해서 딜러 이름 가져오기
const getDealerName = async (req, res) => {
  const { dealerId } = req.params; // URL에서 dealerId 가져오기

  try {
    const dealerResult = await database.query(
      `SELECT dealer_name FROM dealers WHERE dealer_id = $1 AND status = true`,
      [dealerId]
    );

    if (dealerResult.rows.length === 0) {
      return res.status(404).json({ error: "해당 딜러를 찾을 수 없습니다." });
    }

    res.json({ dealerName: dealerResult.rows[0].dealer_name });
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

module.exports = {
  getDealerName,
  getDealerById,
};
