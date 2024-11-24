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
    const seenUsers = new Set(); // To track unique users

    // Iterate through all the ratings of books that the user has rated
    ratingsForBooks.forEach(rating => {
        if (rating.id !== userId && !seenUsers.has(rating.id)) { // Ensure the user is unique
            const otherUserRatings = ratingsForBooks.filter(r => r.id === rating.id);
            const similarity = calculateSimilarity(userRatings, otherUserRatings, ratedBooks);

            // Add to the list and mark user as seen
            similarUsers.push({userId: rating.id, similarity});
            seenUsers.add(rating.id);
        }
    });

    // Sort similar users by similarity in descending order
    similarUsers.sort((a, b) => b.similarity - a.similarity);

    // Ensure top similar users are unique and slice to get top k
    const topSimilarUsers = [...new Map(similarUsers.map(user => [user.userId, user])).values()].slice(0, k);

    console.log("Top similar users:", topSimilarUsers);

    // Now, we need to find the highest-rated books that the current user hasn't rated
    const recommendedBooks = [];
    const seenBooks = new Set(); // To track distinct book ISBNs

// Iterate through the top similar users
    for (const similarUser of topSimilarUsers) {
        // Fetch all the books rated by this similar user
        const similarUserRatings = await getRatingsForBooksRatedByUser(similarUser.userId);

        // Iterate through the books rated by this similar user
        similarUserRatings.forEach(rating => {
            // Recommend the book if the user hasn't rated it yet, if the rating is high, and if it's not already added
            if (!userRatings.some(r => r.book_isbn === rating.book_isbn) && rating.stars >= 4 && !seenBooks.has(rating.book_isbn) // Check if the book is already recommended
            ) {
                // Add to recommended books with a rating
                recommendedBooks.push({
                    book_isbn: rating.book_isbn, stars: rating.stars, userId: similarUser.userId
                });

                // Mark this book as seen
                seenBooks.add(rating.book_isbn);
            }
        });
    }

// Sort recommended books by stars (highest rated first)
    recommendedBooks.sort((a, b) => b.stars - a.stars);

// Limit to the top 10 distinct books
    const top10Books = recommendedBooks.slice(0, 10);

// Extract just the ISBNs of the top 10 books
    const topRecommendedBooks = top10Books.map(book => book.book_isbn);

    console.log("Top recommended books:", topRecommendedBooks);

    return topRecommendedBooks;
}

router.get('/', async (req, res) => {
    if (!req.session.username || !req.session.userId) {
        return res.status(401).json({error: 'User not logged in'});
    }

    const userId = req.session.userId;
    const k = 10; // Number of similar users to consider
    try {
        // Generate recommendations by getting ISBNs of recommended books
        const recommendations = await generateRecommendations(userId, k);

        if (recommendations.length === 0) {
            return res.status(404).send("No recommendations found.");
        }

        // Debugging: Log the recommendations
        console.log("Recommendations ISBNs:", recommendations);

        // Create a string with the appropriate number of `?` placeholders
        const placeholders = recommendations.map(() => '?').join(', ');

        // Query the book details using the ISBNs of the recommended books
        const bookQuery = `
            SELECT isbn13, title
            FROM books
            WHERE isbn13 IN (${placeholders});
        `;

        // Log the SQL query for debugging
        console.log("Executing SQL Query:", bookQuery);

        // Execute the query to get the book details for the recommended ISBNs
        const [bookDetails] = await db.query(bookQuery, recommendations);

        // Log the retrieved book details
        console.log("Book Details:", bookDetails);

        // If bookDetails is empty, check the ISBNs and verify their presence in the books table
        if (bookDetails.length === 0) {
            return res.status(404).send("No books found for the recommended ISBNs.");
        }

        // Return the recommendations with book details
        res.json({recommendations: bookDetails});
    } catch (error) {
        console.error("Error generating recommendations:", error);
        res.status(500).send("Error generating recommendations.");
    }
});

module.exports = router;
