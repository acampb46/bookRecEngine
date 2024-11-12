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

    const query = `INSERT INTO userRatings (id, stars, review, book_isbn, book_title)
                   VALUES (?, ?, ?, ?, ?)`;

    db.query(query, [req.session.userId, stars, review, book_isbn, book_title], (err, result) => {
        if (err) throw err;

        // Send a JSON response to indicate success
        res.json({ success: true });
    });
});

module.exports = router;
