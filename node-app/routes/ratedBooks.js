const express = require('express');
const router = express.Router();
const db = require('../db');

// Fetch books user has rated
router.get('/', async (req, res) => {
    try {
        const userId = req.session.userId;
        const [ratedBooks] = await db.query(`SELECT DISTINCT b.ISBN, b.title, r.stars
                                             FROM userRatings r
                                                      JOIN userBooks b ON r.book_isbn = b.ISBN
                                             WHERE r.id = ?`, [userId]);
        res.json({books: ratedBooks});
    } catch (error) {
        console.error('Error fetching rated books:', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;