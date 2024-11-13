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

        console.log("Fetched ratings for user:", userId, results); // Debug log
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

        // Populate users and books arrays
        ratings.forEach(row => {
            if (!users.includes(row.id)) users.push(row.id);
            if (!books.includes(row.book_isbn)) books.push(row.book_isbn);
        });

        console.log("Users list:", users); // Debug log
        console.log("Books list:", books); // Debug log

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

        console.log("Ratings Matrix:", ratingsMatrix); // Debug log

        // Initialize KNN with the ratingsMatrix and users as labels
        try {
            const knn = new KNN(ratingsMatrix, users);
            console.log("KNN model initialized successfully."); // Debug log
        } catch (error) {
            console.error("Error initializing KNN model:", error); // Debug log
            return callback(error);
        }

        // Find target user's index in users array
        const targetUserIdx = users.indexOf(userId);
        if (targetUserIdx === -1) {
            console.error("Target user not found in users list."); // Debug log
            return callback(new Error("User not found in ratings"));
        }

        // Predict K nearest neighbors
        try {
            const neighbors = knn.predict([ratingsMatrix[targetUserIdx]], k);
            console.log("KNN neighbors for user:", neighbors); // Debug log

            const recommendations = [];
            neighbors.forEach(neighborIdx => {
                ratings.forEach(row => {
                    if (row.id === users[neighborIdx] && !recommendations.includes(row.book_isbn)) {
                        recommendations.push(row.book_isbn);
                    }
                });
            });

            console.log("Recommendations for user:", recommendations); // Debug log
            callback(null, recommendations);
        } catch (error) {
            console.error("Error in KNN prediction:", error); // Debug log
            return callback(error);
        }
    });
}

// Define the /recommendations route
router.get('/', (req, res) => {
    const userId = req.session.userId; // Get the userId from the session
    const k = 5; // Number of nearest neighbors

    console.log("Generating recommendations for user ID:", userId); // Debug log

    recommendBooks(userId, k, (err, recommendations) => {
        if (err) {
            console.error("Error generating recommendations:", err); // Debug log
            return res.status(500).send("Error generating recommendations.");
        }

        const bookQuery = `
          SELECT book_isbn, book_title
          FROM userRatings
          WHERE book_isbn IN (?);
        `;
        db.query(bookQuery, [recommendations], (err, bookDetails) => {
            if (err) {
                console.error("Error fetching book details:", err); // Debug log
                return res.status(500).send("Error fetching book details.");
            }

            console.log("Final book recommendations:", bookDetails); // Debug log
            res.json({ recommendations: bookDetails });
        });
    });
});

module.exports = router;
