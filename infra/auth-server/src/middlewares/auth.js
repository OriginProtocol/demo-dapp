'use strict'

const pick = require('lodash/pick')

const logger = require('../logger')

const verifyToken = require('../utils/verify-token')

const authMiddleware = (req, res, next) => {
  if (!req.headers || !req.headers.authorization) {
    // TODO: What params to log?
    logger.debug('Trying to access without authorization header')
    return res.status(401).send({
      errors: ['Authorization required']
    })
  }

  const [type, token] = req.headers.authorization.split(' ')

  if (type !== 'Bearer') {
    logger.debug('Invalid token type', type, token)
    return res.status(401).send({
      errors: [`Expected 'Bearer' token but got '${type}'`]
    })
  }

  const data = verifyToken(token)

  if (!data) {
    logger.debug('Invalid token type', type, token)
    return res.status(401).send({
      errors: ['Invalid token']
    })
  }

  // Pass down the data if it is needed for the other services
  req.__originAuth = pick(data, ['address', 'signature', 'payload'])

  next()
}

module.exports = authMiddleware
