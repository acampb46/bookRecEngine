// server.js cosc573
require('dotenv').config();
const express = require('express');
const https = require('https');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const port = 12348;

app.set('trust proxy', true);

const options = {
    key: fs.readFileSync('/var/www/key/gerardcosc573_com.key'),
    cert: fs.readFileSync('/etc/ssl/certs/gerardcosc573_chained.pem'),
};

const allowedOrigins = ['https://gerardcosc573.com', 'https://www.gerardcosc573.com'];

app.use(cors({
    credentials: true, origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json()); // To parse JSON bodies
app.use('/static', express.static(path.join('/var/www/html'))); // Serve static files

// Session configuration
app.use(session({
    secret: 'your-secret-key', resave: false, saveUninitialized: true, cookie: {secure: true}
}));

// Import routes
const submitReviewRoute = require('./routes/submitReview');
const userReviewsRoute = require('./routes/userReviews');
const userBooksRoute = require('./routes/userBooks');
const registerRoute = require('./routes/register');
const loginRoute = require('./routes/login')
const isLoggedInRoute = require('./routes/isLoggedIn');
const recommendationsRoute = require('./routes/recommendations');
const toReadBooksRoute = require('./routes/toReadBooks');
const ratedBooksRoute = require('./routes/ratedBooks');

// Use routes
app.use('/submitReview', submitReviewRoute);
app.use('/userReview', userReviewsRoute);
app.use('/userBooks', userBooksRoute);
app.use('/register', registerRoute);
app.use('/login', loginRoute);
app.use('/isLoggedIn', isLoggedInRoute);
app.use('/recommendations', recommendationsRoute);
app.use('/toReadBooks', toReadBooksRoute);
app.use('/ratedBooks', ratedBooksRoute);

// Route to pass environment variables to the client
app.get('/config', (req, res) => {
    res.json({
        apiKey: process.env.GOOGLE_BOOKS_API_KEY, dbKey: process.env.COSC_573_USER_PASSWORD,
    });
});

// Route to get userId from session
app.get('/getUserId', (req, res) => {
    if (req.session.userId) {
        res.json({userId: req.session.userId});
    } else {
        res.status(401).send('User not authenticated');
    }
});

// Route to logout a user
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Logout failed');
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.status(200).send('Logged out');
    });
});


const server = https.createServer(options, app);

server.listen(port, () => {
    console.log(`Server is running on https://gerardcosc573.com:${port}`);
});
