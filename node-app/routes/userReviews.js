const express = require('express');
const router = express.Router();
const db = require('../db');  // Import the database connection

// GET route to fetch user reviews
router.get('/', async (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');

    const query = `SELECT book_title, book_isbn, stars, review FROM userRatings WHERE username = ?`;

    try {
        const [result] = await db.query(query, [req.session.user]);
        res.json({ reviews: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Error fetching user reviews'});
    }
});

module.exports = router;
