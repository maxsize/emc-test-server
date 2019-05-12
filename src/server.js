const express = require("express");
const jwt = require("jwt-simple");
const path = require("path");
const moment = require('moment');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const { jwtValidator, Secret_Key } = require('./jwt-validator');
// setup passport configuration
require('./pass');

const db = require('./db');

const app = express();

app.set(Secret_Key, 'my-test');

const port = 7000;

const jsonParser = bodyParser.json();

app.use(session({
  secret: 'my awesome app',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'resources')));

app.post('/api/user/login', [jsonParser, passport.authenticate('local')], async (req, res) => {
  try {
    const { user } = req;
    // verified, setup jwt
    const expires = moment().day(7).valueOf();
    const token = jwt.encode({
      iss: user._id,
      exp: expires,
    }, app.get(Secret_Key));
    res.json({
      token,
      expires,
      user: JSON.stringify(user)
    });
  } catch (error) {
    res.redirect('/login');
  }
});

app.get('/api/books', jwtValidator(), async (req, res) => {
  try {
    const pagedBooks = await db.getBooks(1, 10);
    res.json(pagedBooks);
  } catch (error) {
    res.json({
      code: 'failure',
      message: error
    })
  }
})

app.post('/api/books/:book_id/reserve', jsonParser, jwtValidator(), async (req, res) => {
  try {
    const { book_id } = req.params;
    const { _id } = req.user;
    const { start_date, end_date } = req.body;
    await db.reserve(book_id, _id.toString(), Number(start_date), Number(end_date));
    res.json({
      code: 'success',
      message: 'Reserve successed'
    })
  } catch (error) {
    res.json({
      code: 'error',
      message: error
    })
  }
})

app.post('/api/user/:user_id/reservations', jwtValidator(), async (req, res) => {
  try {
    const { user_id } = req.params;
    const { _id } = req.user;
    if (user_id !== _id.toString()) {
      res.json({
        code: 'failure',
        message: 'User not match'
      });
    } else {
      const resvs = await db.reservations(user_id);
      res.json({
        code: 'success',
        data: resvs
      })
    }
  } catch (error) {
    rej(error);
  }
})

app.post('/api/user', jsonParser, async (req, res) => {
  try {
    const { name, password } = req.body;
    const succeed = await db.addUser(name, password);
    if (succeed) {
      res.json({
        code: 'success',
        message: 'User added.'
      })
    } else {
      res.json({
        code: 'failure',
        message: `User ${name} already registered';`
      })
    }
  } catch (error) {
    res.json({
      code: 'error',
      message: error
    })
  }
})


// send back index.html for the rest of the requests
app.get('*', (req, res) => res.sendFile(path.join(__dirname + '/resources/index.html')));

app.listen(port);

console.log('App is listening on port ' + port);