const mysql = require('mysql2');
const KNN = require('ml-knn');
const db = require('../db');

// Fetch ratings from the userRatings table for the user and other users
function getUserRatings(userId, callback) {
    const query = `
    SELECT id, book_isbn, stars
    FROM userRatings
    WHERE book_isbn IN (SELECT book_isbn FROM userRatings WHERE id = ?)
  `;
    db.execute(query, [userId], (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
}

// Function to recommend books using KNN
function recommendBooks(userId, k, callback) {
    getUserRatings(userId, (err, ratings) => {
        if (err) return callback(err);

        // Prepare data for KNN: create a matrix of user ratings for each book
        const users = [];
        const books = [];
        const ratingsMatrix = [];

        ratings.forEach(row => {
            const userIdx = users.indexOf(row.id);
            const bookIdx = books.indexOf(row.book_isbn);

            if (userIdx === -1) {
                users.push(row.id);
            }
            if (bookIdx === -1) {
                books.push(row.book_isbn);
            }

            // Populate ratings matrix
            if (!ratingsMatrix[bookIdx]) {
                ratingsMatrix[bookIdx] = [];
            }
            ratingsMatrix[bookIdx][userIdx] = row.stars;
        });

        // Create KNN model and fit it
        const knn = new KNN();
        knn.train(ratingsMatrix);

        // Find the nearest neighbors (similar users) for the target user
        const targetUserIdx = users.indexOf(userId);
        const neighbors = knn.predict([ratingsMatrix[targetUserIdx]]);

        // Use the K nearest neighbors to find books to recommend
        const recommendations = [];
        neighbors.forEach(neighborIdx => {
            // For each similar user, recommend books they have liked but the target user has not rated
            ratings.forEach(row => {
                if (row.id === users[neighborIdx] && !recommendations.includes(row.book_isbn)) {
                    recommendations.push(row.book_isbn);
                }
            });
        });

        callback(null, recommendations);
    });
}
