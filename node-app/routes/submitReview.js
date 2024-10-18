const express = require('express');
const router = express.Router();
const db = require('../db');  // Import the database connection

// POST route to submit a review
router.post('/', (req, res) => {
    const { bookTitle, bookIsbn, rating, review } = req.body;

    const query = `INSERT INTO userRatings (username, date, stars, review, book_isbn, book_title)
                   VALUES (?, NOW(), ?, ?, ?, ?)`;

    db.query(query, [req.session.user, rating, review, bookIsbn, bookTitle], (err, result) => {
        if (err) throw err;
        res.redirect('/dashboard.html');
    });
});

module.exports = router;
