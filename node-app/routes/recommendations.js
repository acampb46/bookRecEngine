const express = require('express');
const KNN = require('ml-knn');
const db = require('../db');

const router = express.Router();

// Fetch ratings from the userRatings table for the user and other users
function getUserRatings(userId, callback) {
    console.log("Fetching ratings for user:", userId);  // Log the userId
    const query = `
    SELECT id, book_isbn, stars
    FROM userRatings
    WHERE book_isbn IN (SELECT book_isbn FROM userRatings WHERE id = ?)
  `;
    db.query(query, [userId], (err, results) => {
        if (err) return callback(err);

        console.log("Query results for user ratings:", results);  // Log query results
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
            const userIdx = users.indexOf(row.id);
            const bookIdx = books.indexOf(row.book_isbn);

            if (userIdx === -1) {
                users.push(row.id);
            }
            if (bookIdx === -1) {
                books.push(row.book_isbn);
            }

            if (!ratingsMatrix[bookIdx]) {
                ratingsMatrix[bookIdx] = [];
            }
            ratingsMatrix[bookIdx][userIdx] = row.stars;
        });

        const knn = new KNN();
        knn.train(ratingsMatrix);

        const targetUserIdx = users.indexOf(userId);
        const neighbors = knn.predict([ratingsMatrix[targetUserIdx]]);
        console.log("KNN neighbors for user:", neighbors);

        // Fetch the ratings of the neighbor(s)
        const recommendations = [];
        neighbors.forEach(neighborIdx => {
            console.log(`Checking ratings for neighbor ${users[neighborIdx]}...`);
            ratings.forEach(row => {
                if (row.id === users[neighborIdx] && !recommendations.includes(row.book_isbn)) {
                    console.log(`Neighbor ${users[neighborIdx]} has rated ${row.book_isbn} with ${row.stars}`);
                    // Only recommend books the target user hasn't rated
                    if (!ratings.some(r => r.book_isbn === row.book_isbn && r.id === userId)) {
                        recommendations.push(row.book_isbn);
                    }
                }
            });
        });

        console.log("Recommendations for user:", recommendations);
        callback(null, recommendations);
    });
}

// Define the /recommendations route
router.get('/', (req, res) => {
    const userId = req.session.userId; // Get the userId from the session
    if (!userId) {
        console.error("No userId in session"); // Log if no userId
        return res.status(401).send("User not authenticated");
    }

    console.log("Generating recommendations for user ID:", userId); // Log the userId

    const k = 5; // Number of nearest neighbors

    // Assuming recommendations is an array of book ISBNs
    recommendBooks(userId, k, (err, recommendations) => {
        if (err) {
            return res.status(500).send("Error generating recommendations.");
        }

        // Log recommendations for debugging
        console.log('Recommendations:', recommendations);

        // Check if there are recommendations
        if (recommendations.length === 0) {
            return res.status(404).send("No recommendations found.");
        }

        const bookQuery = `
      SELECT book_isbn, book_title
      FROM userRatings
      WHERE book_isbn IN (?);
    `;

        // Log the query to check if it's valid
        console.log('Executing SQL query:', bookQuery, recommendations);

        // Pass the recommendations to the query if available
        db.execute(bookQuery, [recommendations], (err, bookDetails) => {
            if (err) {
                console.error('Error fetching book details:', err); // Log the actual error
                return res.status(500).send("Error fetching book details.");
            }

            // Log the result for debugging
            console.log('Book details fetched:', bookDetails);

            res.json({ recommendations: bookDetails });
        });
    });
});

module.exports = router;
