const express = require('express');
const router = express.Router();
const db = require('../db');  // Import the database connection

// GET route to fetch user reviews
router.get('/', (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    
    const query = `SELECT book_title, book_isbn, stars, review FROM userRatings WHERE username = ?`;
    db.query(query, [req.session.user], (err, result) => {
        if (err) throw err;
        res.json({ reviews: result });
    });
});

module.exports = router;
