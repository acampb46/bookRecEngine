const express = require('express');
const router = express.Router();
const db = require('../db');

// Fetch books to be read
router.get('/', async (req, res) => {
    try {
        const userId = req.session.userId;
        const [toReadBooks] = await db.query('SELECT DISTINCT b.ISBN, b.title FROM userBooks b INNER JOIN userRatings ur ON b.userID = ur.id WHERE b.userID = ? AND b.ISBN NOT IN (SELECT book_isbn from userRatings WHERE id=?)', [userId, userId]);
        res.json({books: toReadBooks});
    } catch (error) {
        console.error('Error fetching books to read:', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;
