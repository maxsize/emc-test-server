const passport = require('passport');
const { ExtractJwt, Strategy } = require('passport-jwt');
const { findUser } = require('./db');

const Secret_Key = 'jwtTokenSecret';

passport.use(new Strategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt'),
    secretOrKey: Secret_Key
  },
  function ({ _id, expires }, next) {
    findUser({ _id })
    .then(user => {
      if (!user) {
        console.log('User not found');
        next(null, false);
      } else {
        console.log('user found');
        // check expire date
        if (Date.now() > expires) {
          // session expired
          next(null, false);
        } else {
          next(null, user);
        }
      }
    })
    .catch(error => next(null, false))
  }
))

module.exports = { Secret_Key };