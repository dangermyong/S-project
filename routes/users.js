const express = require("express");
const router = express.Router();
const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const pool = require('../utils/mysql.js');
require('dotenv').config();

/* GET users listing. */
router.get("/", async (req, res, next) => {
  try{
    const connection = await pool.getConnection();
    const [results] = await connection.query('SELECT * FROM ACCOUNT_TB');
    connection.release();
    res.json({ status : 200, arr: results });
  } catch (err) {
    console.log(err);
    res.json({ status : 500, msg : '에러가 났어요!'});
  }
});

router.get("/:id", async (req, res, next) => {
  try{
    const token = req.headers['x-access-token'];
    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.json({ status: 401, msg: '너 권한 없음'});
    } finally {
      if (payload.id !== Number(req.params.id)) {
        return res.json({ status: 403, msg: '이 유저에 대한 정보를 볼 권한 없어!' });
      }
      const userId = req.params.id;
      const connection = await pool.getConnection();
      const [results] = await connection.query('SELECT * FROM ACCOUNT_TB WHERE id = ?', [userId]);
      connection.release();
      res.json({ status : 200, arr: results });
    }
  } catch (err) {
    console.log(err);
    res.json({ status : 500, msg : '에러가 났어요!'});
  }
});

router.post("/", async (req, res, next) => {
  try{
    const name = req.body.name;// body // query
    const email = req.body.email;
    const pwd = req.body.pwd;
    const money = req.body.money;

    const saltByte = await crypto.randomBytes(64);
    const salt = saltByte.toString('base64');
    const hashedPwdByte = crypto.pbkdf2Sync(pwd, salt, 100000, 64, 'SHA512');
    const hashedPwd = hashedPwdByte.toString('base64');

    const connection = await pool.getConnection();
    await connection.query('INSERT INTO ACCOUNT_TB(name, email, money, hashed_pwd, pwd_salt) VALUES(?, ?, ?, ?, ?)', [name, email, money, hashedPwd, salt]);
    connection.release();
    res.json({ status : 201, msg : 'data added!'});
  } catch (err) {
    console.log(err);
    res.json({ status : 500, msg : '에러가 났어요!'});
  }
});

router.post("/login", async (req, res, next) => {
  try{
    const email = req.body.email;
    const pwd = req.body.pwd;

    const connection = await pool.getConnection();
    const [users] = await connection.query('SELECT * FROM ACCOUNT_TB WHERE email = ?', email);
    if (users.length === 0) {
      connection.release();
      return res.json({ status: 401, msg: "일치하지 않는 이메일입니다."})
    }
    const user = users[0];
    const loginHashedPwdByte = crypto.pbkdf2Sync(pwd, user.pwd_salt, 100000, 64, 'SHA512');
    const loginHashedPwd = loginHashedPwdByte.toString('base64');
    if (loginHashedPwd !== user.hashed_pwd) {
      connection.release();
      return res.json({ status: 401, msg: "일치하지 않는 비밀번호 입니다."})
    }
    connection.release();

    const payload = { id: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    res.json({ status : 201, token: token});
  } catch (err) {
    console.log(err);
    res.json({ status : 500, msg : '에러가 났어요!'});
  }
});

module.exports = router;
