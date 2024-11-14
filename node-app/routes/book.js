const express = require('express');
const axios = require('axios');
const router = express.Router();

async function getConfig() {
    try {
        const response = await fetch('https://www.gerardcosc573.com:12348/config');
        const data = await response.json();
        return data.apiKey; // Return the API key
    } catch (error) {
        console.error('Error fetching config:', error);
    }
}

// Helper function to fetch book details from the Google Books API
async function fetchBookDetails(isbn) {

    const apiKey = await getConfig();
    const googleBooksAPI = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`;

    try {
        const response = await axios.get(googleBooksAPI);
        if (response.data.items && response.data.items.length > 0) {
            return response.data.items[0].volumeInfo;  // Returning the volumeInfo part of the response
        } else {
            throw new Error('Book not found');
        }
    } catch (error) {
        throw error;
    }
}

// Route to display book details
router.get('/book/:isbn', async (req, res) => {
    const isbn = req.params.isbn;

    try {
        // Fetch book details from Google Books API
        const bookDetails = await fetchBookDetails(isbn);

        // Render a page with the book details
        res.render('bookDetail', { book: bookDetails });
    } catch (error) {
        console.error("Error fetching book details:", error);
        res.status(404).send("Book not found.");
    }
});

module.exports = router;
