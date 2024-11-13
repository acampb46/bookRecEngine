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

    // Iterate through all the ratings of books that the user has rated
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

    console.log("Top similar users:", topSimilarUsers);

    // Now, we need to find the highest-rated books that the current user hasn't rated
    const recommendedBooks = [];

    // Iterate through the top similar users
    for (const similarUser of topSimilarUsers) {
        // Fetch all the books rated by this similar user
        const similarUserRatings = await getRatingsForBooksRatedByUser(similarUser.userId);

        // Iterate through the books rated by this similar user
        similarUserRatings.forEach(rating => {
            // Recommend the book if the user hasn't rated it yet and if the rating is high
            if (!userRatings.some(r => r.book_isbn === rating.book_isbn) && rating.stars >= 4) {
                // Add to recommended books with a rating
                recommendedBooks.push({
                    book_isbn: rating.book_isbn,
                    stars: rating.stars,
                    userId: similarUser.userId
                });
            }
        });
    }

    // Sort recommended books by stars (highest rated first)
    recommendedBooks.sort((a, b) => b.stars - a.stars);

    // Limit to the top 10 books
    const top10Books = recommendedBooks.slice(0, 10);

    // Extract just the ISBNs of the top 10 books
    const topRecommendedBooks = top10Books.map(book => book.book_isbn);

    console.log("Top recommended books:", topRecommendedBooks);

    return topRecommendedBooks;
}


router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.status(401).send("User not authenticated");
    }

    const k = 5; // Number of similar users to consider
    try {
        // Generate recommendations by getting ISBNs of recommended books
        const recommendations = await generateRecommendations(userId, k);

        if (recommendations.length === 0) {
            return res.status(404).send("No recommendations found.");
        }

        // Debugging: Log the recommendations
        console.log("Recommendations ISBNs:", recommendations);

        // Query the book details using the ISBNs of the recommended books
        const bookQuery = `
            SELECT isbn13, title
            FROM books
            WHERE isbn13 IN (?);
        `;

        // Log the SQL query for debugging
        console.log("Executing SQL Query:", bookQuery);

        // Execute the query to get the book details for the recommended ISBNs
        const [bookDetails] = await db.query(bookQuery, [recommendations]);

        // Log the retrieved book details
        console.log("Book Details:", bookDetails);

        // If bookDetails is empty, check the ISBNs and verify their presence in the books table
        if (bookDetails.length === 0) {
            return res.status(404).send("No books found for the recommended ISBNs.");
        }

        // Return the recommendations with book details
        res.json({ recommendations: bookDetails });
    } catch (error) {
        console.error("Error generating recommendations:", error);
        res.status(500).send("Error generating recommendations.");
    }
});

module.exports = router;
