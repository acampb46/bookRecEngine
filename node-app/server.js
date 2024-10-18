// server.js cosc573

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

app.use(cors({
    origin: 'https://www.gerardcosc573.com', //domain
    credentials: true // Allow credentials (cookies, sessions)
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

// Use routes
app.use('/submitReview', submitReviewRoute);
app.use('/userReview', userReviewsRoute);
app.use('/userBooks', userBooksRoute);
app.use('/register', registerRoute);
app.use('/login', loginRoute);
app.use('/isLoggedIn', isLoggedInRoute);

const server = https.createServer(options, app);

server.listen(port, () => {
    console.log(`Server is running on https://gerardcosc573.com:${port}`);
});
