const express = require('express');
const KNN = require('ml-knn');
const db = require('../db');

const router = express.Router();

// Fetch ratings from the userRatings table for the user and other users
function getUserRatings(userId, callback) {
    const query = `
        SELECT id, book_isbn, stars
        FROM userRatings
        WHERE book_isbn IN (SELECT book_isbn FROM userRatings WHERE id = ?)
    `;
    db.query(query, [userId], (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
}

// Function to recommend books using KNN
function recommendBooks(userId, k, callback) {
    getUserRatings(userId, (err, ratings) => {
        if (err) return callback(err);

        const users = [];
        const books = [];
        const ratingsMatrix = [];

        // Populate users, books arrays and build a sparse matrix
        ratings.forEach(row => {
            if (!users.includes(row.id)) users.push(row.id);
            if (!books.includes(row.book_isbn)) books.push(row.book_isbn);
        });

        // Initialize ratingsMatrix with zeros
        for (let i = 0; i < users.length; i++) {
            ratingsMatrix[i] = Array(books.length).fill(0);
        }

        // Fill ratingsMatrix with actual ratings
        ratings.forEach(row => {
            const userIdx = users.indexOf(row.id);
            const bookIdx = books.indexOf(row.book_isbn);
            ratingsMatrix[userIdx][bookIdx] = row.stars;
        });

        const knn = new KNN(ratingsMatrix, users); // Use users as labels

        const targetUserIdx = users.indexOf(userId);
        if (targetUserIdx === -1) {
            return callback(new Error("User not found in ratings"));
        }

        // Find k nearest neighbors for the target user
        const neighbors = knn.predict([ratingsMatrix[targetUserIdx]], k);

        const recommendations = [];
        neighbors.forEach(neighborIdx => {
            ratings.forEach(row => {
                if (row.id === users[neighborIdx] && !recommendations.includes(row.book_isbn)) {
                    recommendations.push(row.book_isbn);
                }
            });
        });

        callback(null, recommendations);
    });
}

// Define the /recommendations route
router.get('/', (req, res) => {
    const userId = req.session.userId; // Get the userId from the session
    const k = 5; // Number of nearest neighbors

    recommendBooks(userId, k, (err, recommendations) => {
        if (err) {
            return res.status(500).send("Error generating recommendations.");
        }

        const bookQuery = `
          SELECT book_isbn, book_title
          FROM userRatings
          WHERE book_isbn IN (?);
        `;
        db.query(bookQuery, [recommendations], (err, bookDetails) => {
            if (err) return res.status(500).send("Error fetching book details.");
            res.json({ recommendations: bookDetails });
        });
    });
});

module.exports = router;
