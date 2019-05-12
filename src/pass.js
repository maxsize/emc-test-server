const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { findUser } = require('./db');

passport.use(new LocalStrategy(
  function (username, password, done) {
    findUser({ name: username })
    .then(user => {
      if (!user) {
        console.log('User not found');
        return done(null, false, { message: 'User not found' });
      }
      if (user.password !== password) {
        console.log('Incorrect password');
        console.log(user, password);
        return done(null, false, { message: 'Incorrect password' });
      }
      return done(null, user);
    })
    .catch(error => done(error))
  }
))

passport.serializeUser((user, done) => done(null, user.name));

passport.deserializeUser(async (name, done) => {
  try {
    console.log('deserialize user, ' + name)
    const user = await findUser({ name });
    done(null, user);
  } catch (error) {
    done(error);
  }
})
