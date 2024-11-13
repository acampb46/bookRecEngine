const express = require('express');
const KNN = require('ml-knn');
const db = require('../db');

const router = express.Router();

// Fetch ratings from the userRatings table for the user and other users
function getUserRatings(userId, callback) {
    console.log("Fetching ratings for user:", userId);
    const query = `
        SELECT id, book_isbn, stars
        FROM userRatings
        WHERE book_isbn IN (SELECT book_isbn FROM userRatings WHERE id = ?)
    `;
    db.query(query, [userId], (err, results) => {
        if (err) return callback(err);

        console.log("Query results for user ratings:", results);
        if (results.length === 0) {
            return callback(new Error("No ratings found for user"));
        }

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

        ratings.forEach(row => {
            let userIdx = users.indexOf(row.id);
            let bookIdx = books.indexOf(row.book_isbn);

            if (userIdx === -1) {
                userIdx = users.length;
                users.push(row.id);
            }
            if (bookIdx === -1) {
                bookIdx = books.length;
                books.push(row.book_isbn);
            }

            if (!ratingsMatrix[userIdx]) {
                ratingsMatrix[userIdx] = Array(books.length).fill(0);
            }
            ratingsMatrix[userIdx][bookIdx] = row.stars;
        });

        if (ratingsMatrix.length === 0 || ratingsMatrix.some(row => row.length === 0)) {
            console.error("Error: ratingsMatrix is empty or malformed.");
            return callback(new Error("Insufficient data for recommendations."));
        }

        const knn = new KNN(ratingsMatrix);
        const targetUserIdx = users.indexOf(userId);

        const neighbors = knn.kNeighbors(ratingsMatrix[targetUserIdx], {k});
        console.log("KNN neighbors for user:", neighbors);

        const recommendations = new Set();
        neighbors.forEach(neighborIdx => {
            ratings.forEach(row => {
                if (row.id === users[neighborIdx] && row.id !== userId) {
                    if (!ratings.some(r => r.book_isbn === row.book_isbn && r.id === userId)) {
                        recommendations.add(row.book_isbn);
                    }
                }
            });
        });

        console.log("Recommendations for user:", Array.from(recommendations));
        callback(null, Array.from(recommendations));
    });
}

// Define the /recommendations route
router.get('/', (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        console.error("No userId in session");
        return res.status(401).send("User not authenticated");
    }

    console.log("Generating recommendations for user ID:", userId);
    const k = 5;

    recommendBooks(userId, k, (err, recommendations) => {
        if (err) {
            console.error('Error generating recommendations:', err);
            return res.status(500).send("Error generating recommendations.");
        }

        console.log('Recommendations:', recommendations);

        if (recommendations.length === 0) {
            return res.status(404).send("No recommendations found.");
        }

        const bookQuery = `
            SELECT book_isbn, book_title
            FROM userRatings
            WHERE book_isbn IN (?);
        `;

        console.log('Executing SQL query for book details:', bookQuery, recommendations);

        db.execute(bookQuery, [recommendations], (err, bookDetails) => {
            if (err) {
                console.error('Error fetching book details:', err);
                return res.status(500).send("Error fetching book details.");
            }

            console.log('Book details fetched:', bookDetails);
            res.json({recommendations: bookDetails});
        });
    });
});

module.exports = router;
