const jwt = require('jwt-simple');
const db = require('./db');

const Secret_Key = 'jwtTokenSecret';

const jwtValidator = () => async (req, res, next) => {
  // for any api request, we will do jwt validation
  const token = req.headers['x-access-token'];
  if (token) {
    // check expiration
    try {
      const decoded = jwt.decode(token, req.app.get(Secret_Key));
      if (decoded.exp < Date.now()) {
        res.end('Access token has expired.', 400);
      } else {
        try {
          const user = await db.findUser({ _id: decoded.iss });
          req.user = user;
          next();
        } catch (error) {
          // in case we don't have the user, redirect to login page
          redirect(res);
        }
      }
    } catch (error) {
      redirect(res);
    }
  } else {
    redirect(res);
  }
}

const redirect = res => res.json({
  code: 'invalid token',
  message: 'invalid token'
})

module.exports = { jwtValidator, Secret_Key };