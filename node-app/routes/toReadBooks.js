const express = require('express');
const router = express.Router();
const db = require('../db');

// Fetch books to be read
router.get('/', async (req, res) => {
    try {
        const userId = req.session.userId;
        const [toReadBooks] = await db.query('SELECT DISTINCT b.ISBN, b.title FROM userBooks b JOIN userRatings r ON  b.userID=r.id WHERE b.userID = ? AND b.ISBN NOT IN (SELECT book_isbn FROM userRatings WHERE id=?)', [userId]);
        res.json({books: toReadBooks});
    } catch (error) {
        console.error('Error fetching books to read:', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;