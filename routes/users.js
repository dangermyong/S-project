const express = require("express");
const router = express.Router();

const pool = require('../utils/mysql.js');

/* GET users listing. */
router.get("/", async (req, res, next) => {
  try{
    const connection = await pool.getConnection();
    const [results] = await connection.query('SELECT * FROM ACCOUNT_TB');
    let sum = 0;
    for (let user of results) {
      sum += user.money;
    }
    const avg = sum / results.length;
    const [results2] = await connection.query('SELECT * FROM ACCOUNT_TB WHERE money > ?', [avg]);
    connection.release();
    res.json({ status : 200, arr: results2 });
  } catch (err) {
    console.log(err);
    res.json({ status : 500, msg : '에러가 났어요!'});
  }
});

module.exports = router;
