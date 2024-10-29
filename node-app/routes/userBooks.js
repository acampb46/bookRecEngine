const express = require('express');
const router = express.Router();
const db = require('../db');  // Import the database connection

// GET route to fetch user's books
router.get('/', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).send({ message: 'You must be logged in to add books.' });
    }

    const query = `SELECT title, author, ISBN
                   FROM userBooks
                   WHERE userId = ?`;
    db.query(query, [req.session.userId], (err, result) => {
        if (err) throw err;
        res.json({books: result});
    });
});

// POST route to add a new book
router.post('/', (req, res) => {
    if (!req.session.userId) return res.status(401).send('Unauthorized'); // Check for userId in session

    const {
        title,
        author,
        publisher,
        publishedDate,
        description,
        ISBN,
        pageCount,
        categories,
        averageRating,
        ratingsCount,
        imageLink,
        buyLink,
        webReaderLink
    } = req.body;

    // SQL query to insert the new book into the userBooks table
    const addBookQuery = `
        INSERT INTO userBooks (userId, title, author, publisher, publishedDate, description, ISBN, pageCount,
                               categories, averageRating, ratingsCount, imageLink, buyLink, webReaderLink)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const bookData = [req.session.userId, title, author, publisher, publishedDate, description, ISBN, pageCount, categories, averageRating, ratingsCount, imageLink, buyLink, webReaderLink];
    // Execute the query with the relevant data
    db.query(addBookQuery, bookData, (err, result) => {
        if (err) {
            console.error('Error inserting book:', err);
            return res.status(500).send('Error adding book.');
        }
        res.status(200).send('Book added successfully!');
    });

});

module.exports = router;
