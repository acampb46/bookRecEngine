const express = require('express');
const KNN = require('ml-knn');
const db = require('../db');
const cosineSimilarity = require('cosine-similarity'); // for calculating similarity

const router = express.Router();

// Fetch ratings from the userRatings table for a specific user
async function getUserRatings(userId) {
    console.log(`Fetching ratings for user with ID: ${userId}`);
    const query = `
        SELECT id, book_isbn, stars
        FROM userRatings
        WHERE id = ?;
    `;
    try {
        const [results] = await db.query(query, [userId]);
        if (results.length === 0) {
            console.error(`No ratings found for user with ID: ${userId}`);
            throw new Error("No ratings found for user");
        }
        console.log(`Ratings fetched for user ${userId}:`, results);
        return results;
    } catch (error) {
        console.error("Error fetching user ratings:", error);
        throw error;
    }
}

// Fetch all ratings for books that the user has rated
async function getRatingsForBooksRatedByUser(userId) {
    console.log(`Fetching ratings for books rated by user with ID: ${userId}`);
    const query = `
        SELECT id, book_isbn, stars
        FROM userRatings
        WHERE book_isbn IN (SELECT book_isbn FROM userRatings WHERE id = ?);
    `;
    try {
        const [results] = await db.query(query, [userId]);
        console.log(`Ratings for books rated by user ${userId}:`, results);
        return results;
    } catch (error) {
        console.error("Error fetching ratings for books:", error);
        throw error;
    }
}

// Function to calculate cosine similarity between two users' ratings
function calculateSimilarity(userRatings, otherUserRatings, ratedBooks) {
    console.log(`Calculating similarity between users`);
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
    const similarity = cosineSimilarity(userVector, otherUserVector);
    console.log(`Similarity calculated: ${similarity}`);
    return similarity;
}

// Function to generate recommendations
async function generateRecommendations(userId, k) {
    console.log(`Generating recommendations for user ${userId} using the top ${k} similar users`);
    // Fetch the user's ratings and the ratings of others who rated the same books
    const userRatings = await getUserRatings(userId);
    const ratingsForBooks = await getRatingsForBooksRatedByUser(userId);

    const ratedBooks = [...new Set(userRatings.map(r => r.book_isbn))]; // Get unique books rated by the user
    console.log(`Books rated by user ${userId}:`, ratedBooks);
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
    console.log("Sorted similar users by similarity:", similarUsers);

    // Get top k similar users
    const topSimilarUsers = similarUsers.slice(0, k);
    console.log(`Top ${k} similar users:`, topSimilarUsers);

    // Now, we need to find the books rated highly by similar users that the current user has not rated
    const recommendedBooks = new Set();
    topSimilarUsers.forEach(similarUser => {
        const otherUserRatings = ratingsForBooks.filter(r => r.id === similarUser.userId);
        otherUserRatings.forEach(rating => {
            // Recommend the book if the user hasn't rated it yet and if the rating is high
            if (!userRatings.some(r => r.book_isbn === rating.book_isbn) && rating.stars >= 4) {
                console.log(`Recommending book with ISBN: ${rating.book_isbn} rated by user ${similarUser.userId}`);
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
        console.error("No userId found in session");
        return res.status(401).send("User not authenticated");
    }

    const k = 5; // Number of similar users to consider
    console.log(`Generating recommendations for user ${userId} with k = ${k}`);

    try {
        const recommendations = await generateRecommendations(userId, k);
        console.log(`Recommendations generated:`, recommendations);

        if (recommendations.length === 0) {
            console.log("No recommendations found.");
            return res.status(404).send("No recommendations found.");
        }

        const bookQuery = `
            SELECT book_isbn, book_title
            FROM userRatings
            WHERE book_isbn IN (?);
        `;
        console.log("Executing SQL query for book details:", bookQuery, recommendations);

        const [bookDetails] = await db.query(bookQuery, [recommendations]);

        console.log("Book details fetched:", bookDetails);
        res.json({ recommendations: bookDetails });
    } catch (error) {
        console.error("Error generating recommendations:", error);
        res.status(500).send("Error generating recommendations.");
    }
});

module.exports = router;
