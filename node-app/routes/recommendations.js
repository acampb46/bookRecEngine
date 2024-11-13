const express = require('express');
const KNN = require('ml-knn');
const db = require('../db');
const cosineSimilarity = require('cosine-similarity'); // for calculating similarity

const router = express.Router();

// Fetch ratings from the userRatings table for a specific user
async function getUserRatings(userId) {
    const query = `
        SELECT id, book_isbn, stars
        FROM userRatings
        WHERE id = ?;
    `;
    try {
        const [results] = await db.query(query, [userId]);
        if (results.length === 0) throw new Error("No ratings found for user");
        return results;
    } catch (error) {
        throw error;
    }
}

// Fetch all ratings for books that the user has rated
async function getRatingsForBooksRatedByUser(userId) {
    const query = `
        SELECT id, book_isbn, stars
        FROM userRatings
        WHERE book_isbn IN (SELECT book_isbn FROM userRatings WHERE id = ?);
    `;
    try {
        const [results] = await db.query(query, [userId]);
        return results;
    } catch (error) {
        throw error;
    }
}

// Function to calculate cosine similarity between two users' ratings
function calculateSimilarity(userRatings, otherUserRatings, ratedBooks) {
    const userVector = [];
    const otherUserVector = [];

    // Build rating vectors for the user and the other user
    ratedBooks.forEach(book => {
        const userRating = userRatings.find(r => r.book_isbn === book);
        const otherUserRating = otherUserRatings.find(r => r.book_isbn === book);
        userVector.push(userRating ? userRating.stars : 0);  // Add 0 if no rating
        otherUserVector.push(otherUserRating ? otherUserRating.stars : 0);
    });

    // Calculate cosine similarity between the two rating vectors
    return cosineSimilarity(userVector, otherUserVector);
}

// Function to generate recommendations
async function generateRecommendations(userId, k) {
    // Fetch the user's ratings and the ratings of others who rated the same books
    const userRatings = await getUserRatings(userId);
    const ratingsForBooks = await getRatingsForBooksRatedByUser(userId);

    const ratedBooks = [...new Set(userRatings.map(r => r.book_isbn))]; // Get unique books rated by the user
    const similarUsers = [];

    ratingsForBooks.forEach(rating => {
        if (rating.id !== userId) { // Don't compare with the same user
            const otherUserRatings = ratingsForBooks.filter(r => r.id === rating.id);
            const similarity = calculateSimilarity(userRatings, otherUserRatings, ratedBooks);

            // Push the similarity score and the user ID into the array
            similarUsers.push({ userId: rating.id, similarity });
        }
    });

    // Sort similar users by similarity in descending order
    similarUsers.sort((a, b) => b.similarity - a.similarity);

    // Get top k similar users
    const topSimilarUsers = similarUsers.slice(0, k);

    // Now, we need to find the books rated highly by similar users that the current user has not rated
    const recommendedBooks = new Set();
    topSimilarUsers.forEach(similarUser => {
        const otherUserRatings = ratingsForBooks.filter(r => r.id === similarUser.userId);
        otherUserRatings.forEach(rating => {
            // Recommend the book if the user hasn't rated it yet and if the rating is high
            if (!userRatings.some(r => r.book_isbn === rating.book_isbn) && rating.stars >= 4) {
                recommendedBooks.add(rating.book_isbn);
            }
        });
    });

    return Array.from(recommendedBooks);
}

// Define the /recommendations route
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.status(401).send("User not authenticated");
    }

    const k = 5; // Number of similar users to consider
    try {
        const recommendations = await generateRecommendations(userId, k);

        if (recommendations.length === 0) {
            return res.status(404).send("No recommendations found.");
        }

        const bookQuery = `
            SELECT book_isbn, book_title
            FROM userRatings
            WHERE book_isbn IN (?);
        `;

        const [bookDetails] = await db.query(bookQuery, [recommendations]);

        res.json({ recommendations: bookDetails });
    } catch (error) {
        console.error("Error generating recommendations:", error);
        res.status(500).send("Error generating recommendations.");
    }
});

module.exports = router;
