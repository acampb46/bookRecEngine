const express = require('express');
const router = express.Router();
const db = require('../db');  // Import the database connection

// POST route to submit a review
router.post('/', (req, res) => {
    if (!req.session.username || !req.session.userId) {
        return res.status(401).json({ error: 'User not logged in' });
    }
    const { book_title, book_isbn, stars, review } = req.body;

    console.log(req.body);

    const query = `INSERT INTO userRatings (id, username, date, stars, review, book_isbn, book_title)
                   VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)`;

    db.query(query, [req.session.userId, req.session.username, stars, review, book_isbn, book_title], (err, result) => {
        if (err) throw err;
        res.redirect("https://gerardcosc631.com/dashboard.html")
    });
});

module.exports = router;
