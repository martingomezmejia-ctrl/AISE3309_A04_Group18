require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // serves index.html

// -------------------------------
// MySQL CONNECTION POOL
// -------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// -------------------------------
// ROUTE: ADD NEW USER
// -------------------------------
app.post('/add_user', async (req, res) => {
  try {
    const { studentNum, fName, lName, studentEmail, studentMainPhone } = req.body;

    const sql = `
      INSERT INTO Student (studentNum, fName, lName, studentEmail, studentMainPhone)
      VALUES (?, ?, ?, ?, ?)
    `;

    await pool.query(sql, [
      studentNum,
      fName,
      lName,
      studentEmail,
      studentMainPhone
    ]);

    res.json({ message: "User added successfully!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database insert error" });
  }
});

// -------------------------------
// ROUTE: GET ALL USERS
// -------------------------------
app.get('/get_users', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM Student");
    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database fetch error" });
  }
});

// -------------------------------
// START SERVER
// -------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
