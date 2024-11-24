const express = require('express');
const router = express.Router();

// Route definition 
router.get('/', (req, res) => {

    if (req.session.user) {
        return res.json({loggedIn: true, username: req.session.user});
    }

    res.json({loggedIn: false});
});

module.exports = router;
