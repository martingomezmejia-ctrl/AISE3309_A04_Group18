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
  database: process.env.DB_NAME, // universitydb
  port: process.env.DB_PORT || 3306
});

// -------------------------------
// HEALTH CHECK
// -------------------------------
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS studentCount FROM student'
    );
    res.json({
      ok: true,
      db: process.env.DB_NAME,
      studentCount: rows[0].studentCount
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ------------------------------------------------------
// 1) ADD NEW STUDENT  (INSERT)
// ------------------------------------------------------
app.post('/add_user', async (req, res) => {
  try {
    const { studentNum, fName, lName, studentEmail, studentMainPhone } = req.body;

    const sql = `
      INSERT INTO student (studentNum, fName, lName, studentEmail, studentMainPhone)
      VALUES (?, ?, ?, ?, ?)
    `;

    await pool.query(sql, [
      studentNum,
      fName,
      lName,
      studentEmail,
      studentMainPhone
    ]);

    res.json({ message: 'User added successfully!' });
  } catch (err) {
    console.error('Insert error:', err);
    res.status(500).json({ error: 'Database insert error' });
  }
});

// ------------------------------------------------------
// 2) GET ALL STUDENTS  (SELECT)
// ------------------------------------------------------
app.get('/get_users', async (req, res) => {
  try {
    const sql = `
      SELECT studentNum, fName, lName, studentEmail, studentMainPhone
      FROM student
      ORDER BY lName, fName
    `;
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Database fetch error' });
  }
});

// ------------------------------------------------------
// 3) UPDATE STUDENT CONTACT INFO  (UPDATE)
//     PUT /students/:studentNum
// ------------------------------------------------------
app.put('/students/:studentNum', async (req, res) => {
  try {
    const { studentNum } = req.params;
    const { studentEmail, studentMainPhone } = req.body;

    const sql = `
      UPDATE student
      SET studentEmail = ?, studentMainPhone = ?
      WHERE studentNum = ?
    `;

    const [result] = await pool.query(sql, [
      studentEmail,
      studentMainPhone,
      studentNum
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Database update error' });
  }
});

// ------------------------------------------------------
// 4) DELETE STUDENT  (DELETE)
//     DELETE /students/:studentNum
// ------------------------------------------------------
app.delete('/students/:studentNum', async (req, res) => {
  try {
    const { studentNum } = req.params;

    const sql = 'DELETE FROM student WHERE studentNum = ?';
    const [result] = await pool.query(sql, [studentNum]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Database delete error' });
  }
});

// ------------------------------------------------------
// 5) COURSES TAUGHT BY A PROFESSOR (JOIN)
//     GET /professors/:professorID/courses
//     uses teaches(professorID, courseID) + course(courseID, courseName…)
// ------------------------------------------------------
app.get('/professors/:professorID/courses', async (req, res) => {
  try {
    const { professorID } = req.params;

    const sql = `
      SELECT 
        c.courseID,
        c.courseName,
        c.taName,
        c.deptEmail
      FROM teaches t
      JOIN course c ON c.courseID = t.courseID
      WHERE t.professorID = ?
      ORDER BY c.courseID
    `;

    const [rows] = await pool.query(sql, [professorID]);
    res.json(rows);
  } catch (err) {
    console.error('Professor courses query error:', err);
    res.status(500).json({ error: 'Error fetching courses for professor' });
  }
});

// ------------------------------------------------------
// 6) COURSE ENROLLMENT REPORT (JOIN + GROUP BY)
//     GET /reports/course-enrollment
// NOTE: This assumes you have an "attends" table with
//       (studentNum, courseID). If the column names differ,
//       adjust them in the JOIN below.
// ------------------------------------------------------
app.get('/reports/course-enrollment', async (req, res) => {
  try {
    const sql = `
      SELECT 
        c.courseID,
        c.courseName,
        COUNT(a.studentNum) AS numStudents
      FROM course c
      LEFT JOIN attends a ON a.courseID = c.courseID  -- adjust if needed
      GROUP BY c.courseID, c.courseName
      ORDER BY numStudents DESC, c.courseID
    `;

    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Enrollment report error:', err);
    res.status(500).json({ error: 'Error generating enrollment report' });
  }
});

// ------------------------------------------------------
// 6) Add Faculty (JOIN + GROUP BY)
// ------------------------------------------------------

// ADD FACULTY
app.post("/add_faculty", async (req, res) => {
  try {
    const { facultyName, facultyOffice, facultyMainPhone, facultyEmail } = req.body;

    const sql = `
      INSERT INTO Faculty (facultyName, facultyOffice, facultyPhone, facultyEmail)
      VALUES (?, ?, ?)
    `;

    const [result] = await pool.query(sql, [
      facultyName,
      facultyOffice,
      facultyMainPhone,
      facultyEmail
    ]);

    res.send("Faculty added!");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET ALL FACULTY
app.get("/get_faculty", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM Faculty");
    res.json(rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// -------------------------------
// START SERVER
// -------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
