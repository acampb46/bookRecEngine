const express = require('express');
const router = express.Router();
const db = require('../db');  // Import the database connection

// GET route to fetch user's books (placeholder functionality)
router.get('/', (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    
    const query = `SELECT book_title, book_isbn FROM userBooks WHERE username = ?`; // Assuming a userBooks table exists
    db.query(query, [req.session.user], (err, result) => {
        if (err) throw err;
        res.json({ books: result });
    });
});

module.exports = router;
