const express = require('express');
const router = express.Router();
const db = require('../db');  // Import the database connection

// POST route to submit a review
router.post('/', async (req, res) => {
    if (!req.session.username || !req.session.userId) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    const { book_title, book_isbn, stars } = req.body;

    console.log(req.body);

    const query = `INSERT INTO userRatings (id, stars, book_isbn, book_title)
                   VALUES (?, ?, ?, ?)`;

    try {
        const [result] = await db.query(query, [req.session.userId, stars, book_isbn, book_title]);

        // Send a JSON response to indicate success
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

module.exports = router;
