const express = require('express');
const router = express.Router();
const db = require('../db');

// Fetch books to be read
router.get('/', async (req, res) => {
    try {
        const userId = req.session.userId;
        const [toReadBooks] = await db.query('SELECT DISTINCT b.ISBN, b.title
FROM userBooks b
JOIN userRatings r ON b.userID = r.id
WHERE b.userID = ?
  AND NOT EXISTS (
    SELECT 1
    FROM userRatings ur
    WHERE ur.id = ? AND ur.book_isbn = b.ISBN
  );
)', [userId, userId]);
        res.json({books: toReadBooks});
    } catch (error) {
        console.error('Error fetching books to read:', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;
