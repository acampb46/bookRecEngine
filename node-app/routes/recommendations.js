const express = require('express');
const KNN = require('ml-knn');
const db = require('../db');

const router = express.Router();

// Fetch ratings from the userRatings table for a specific user
async function getUserRatings(userId) {
    console.log("Fetching ratings for user:", userId);
    const query = `
        SELECT id, book_isbn, stars
        FROM userRatings
        WHERE book_isbn IN (SELECT book_isbn FROM userRatings WHERE id = ?)
    `;
    try {
        // Use db.query directly because it's already promise-based
        const [results] = await db.query(query, [userId]);
        console.log("Query results for user ratings:", results);
        if (results.length === 0) throw new Error("No ratings found for user");

        return results;
    } catch (error) {
        console.error("Error fetching user ratings:", error);
        throw error;
    }
}

// Function to build ratings matrix and train KNN
function trainKNN(ratings) {
    const users = [];
    const books = [];
    const ratingsMatrix = [];

    console.log("Ratings data:", ratings);  // Log the ratings data

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

        if (!ratingsMatrix[userIdx]) ratingsMatrix[userIdx] = Array(books.length).fill(0);
        ratingsMatrix[userIdx][bookIdx] = row.stars;
    });

    console.log("Users:", users);
    console.log("Books:", books);
    console.log("Ratings Matrix:", ratingsMatrix);

    if (ratingsMatrix.length === 0 || ratingsMatrix.some(row => row.length === 0)) {
        console.error("Error: ratingsMatrix is empty or malformed.");
        throw new Error("Insufficient data for recommendations.");
    }

    // Train KNN on the ratings matrix
    const knn = new KNN();
    knn.train(ratingsMatrix, users);
    return { knn, users, books };
}

function generateRecommendations(ratings, userId, k) {
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

        if (!ratingsMatrix[userIdx]) ratingsMatrix[userIdx] = Array(books.length).fill(0);
        ratingsMatrix[userIdx][bookIdx] = row.stars;
    });

    const targetUserIdx = users.indexOf(userId);
    const targetUserRatings = ratingsMatrix[targetUserIdx];

    // Filter out books the target user hasn't rated
    const ratedBooksIndices = targetUserRatings.map((rating, idx) => rating > 0 ? idx : -1).filter(idx => idx !== -1);

    // Only use books the target user has rated
    const knn = new KNN(ratingsMatrix.map(row => ratedBooksIndices.map(idx => row[idx])));

    const neighbors = knn.kNeighbors(ratingsMatrix[targetUserIdx], { k });

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

    return Array.from(recommendations);
}

// Define the /recommendations route
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        console.error("No userId in session");
        return res.status(401).send("User not authenticated");
    }

    console.log("Generating recommendations for user ID:", userId);
    const k = 5;

    try {
        // Get user ratings
        const ratings = await getUserRatings(userId);

        // Train the KNN model using ratings data
        const { knn, users, books } = trainKNN(ratings);

        // Generate recommendations based on KNN
        const recommendations = generateRecommendations(ratings, userId, knn, users, books, k);

        if (recommendations.length === 0) {
            return res.status(404).send("No recommendations found.");
        }

        const bookQuery = `
            SELECT book_isbn, book_title
            FROM userRatings
            WHERE book_isbn IN (?);
        `;

        console.log("Executing SQL query for book details:", bookQuery, recommendations);

        // Use db.query to fetch book details, passing recommendations as parameter
        const [bookDetails] = await db.query(bookQuery, [recommendations]);

        console.log("Book details fetched:", bookDetails);
        res.json({ recommendations: bookDetails });
    } catch (error) {
        console.error("Error generating recommendations:", error);
        res.status(500).send("Error generating recommendations.");
    }
});

module.exports = router;
