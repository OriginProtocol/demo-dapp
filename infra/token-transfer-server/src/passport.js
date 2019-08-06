'use strict'

const passport = require('passport')
const BearerStrategy = require('passport-http-bearer').Strategy
const TotpStrategy = require('passport-totp').Strategy
const logger = require('./logger')
const { decrypt } = require('./lib/crypto')
const jwt = require('jsonwebtoken')

const { User } = require('./models')

module.exports = function() {
  passport.serializeUser(function(user, done) {
    logger.debug('Serializing user with email', user.email)
    done(null, user.email)
  })

  passport.deserializeUser(async function(id, done) {
    logger.debug('Deserializing user with id', id)
    try {
      const user = await User.findOne({ where: { email: id } })
      if (!user) {
        return done(null, false)
      }
      return done(null, user)
    } catch (e) {
      return done(e)
    }
  })

  passport.use(
    new BearerStrategy(async (token, done) => {
      logger.debug('Passport bearer strategy called')
      let decodedToken
      try {
        decodedToken = jwt.verify(token, process.env.ENCRYPTION_SECRET)
      } catch (error) {
        return done(null, false)
      }

      try {
        const user = await User.findOne({
          where: { email: decodedToken.email }
        })
        if (!user) {
          // No user with that email found.
          return done(null, false)
        }
        // All good
        return done(null, user)
      } catch (e) {
        // Something went wrong. Return an error.
        return done(e)
      }
    })
  )

  passport.use(
    new TotpStrategy((user, done) => {
      logger.debug('Passport TOTP strategy called for', user.email)
      // Supply key and period to done callback for verification.
      const otpKey = decrypt(user.otpKey)
      const period = 30
      return done(null, otpKey, period)
    })
  )
}
