const express = require('express');
const router = express.Router();
const db = require('../db');  // Import the database connection

// GET route to fetch user's books
router.get('/', async (req, res) => {
    if (!req.session.userId) return res.status(401).send('Unauthorized'); // Ensure user is authenticated

    const query = `SELECT title, author, ISBN
                   FROM userBooks
                   WHERE userId = ?`; // Use userId instead of username
    try {
        const [result] = await db.query(query, [req.session.userId]);
        res.json({books: result});
    } catch (err) {
        console.error('Error fetching user books:', err);
        res.status(500).send('Error fetching books.');
    }
});

// POST route to add a new book
router.post('/', async (req, res) => {
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

    try {
        await db.query(addBookQuery, bookData);
        res.status(200).send('Book added successfully!');
    } catch (err) {
        console.error('Error inserting book:', err);
        res.status(500).send('Error adding book.');
    }
});

module.exports = router;
