var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3');

/* GET home page. */
router.get('/', function(req, res, next) {
    console.log('Render');
    res.render("index", {
        title: "Lambeth Repairs",
    });
});

module.exports = router;
