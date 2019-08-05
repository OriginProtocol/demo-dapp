import React from 'react'

import { fbt } from 'fbt-runtime'

import queryString from 'query-string'

import { withRouter } from 'react-router-dom'
import withIdentity from 'hoc/withIdentity'
import withEnrolmentStatus from 'hoc/withEnrolmentStatus'

import Link from 'components/Link'
import UserActivationLink from 'components/UserActivationLink'

const SignUpForRewards = withIdentity(({ identity }) => {
  const LinkComponent = identity ? Link : UserActivationLink

  const destination = { pathname: '/campaigns' }

  return (
    <div className="listing-card rewards-signup-card">
      <LinkComponent to={destination} location={destination}>
        <div className="main-pic">
          <div>
            <fbt desc="listingCard.earnTokens">
              Earn
              <span>Origin Tokens</span>
            </fbt>
          </div>
        </div>
      </LinkComponent>
      <h5>
        <fbt desc="listingCard.earnTokens.from">From the Origin Team</fbt>
      </h5>
    </div>
  )
})

const BuyListingsForRewards = withRouter(({ history }) => {
  return (
    <div className="listing-card earn-tokens-card">
      <div
        className="main-pic"
        onClick={() => {
          history.push({
            pathname: '/search',
            search: queryString.stringify({
              ognListings: true
            })
          })
        }}
      />
    </div>
  )
})

const EarnTokensCard = ({ growthEnrollmentStatus, ...props }) => {
  if (growthEnrollmentStatus === 'Enrolled') {
    // Show Enrolled Card
    return <BuyListingsForRewards />
  }

  return <SignUpForRewards {...props} />
}

export default withEnrolmentStatus(EarnTokensCard)

require('react-styl')(`
  .listing-card
    &.rewards-signup-card
      .main-pic
        text-align: center
        position: relative
        background-color: var(--clear-blue)
        > div
          position: absolute
          bottom: 0
          left: 0
          right: 0
          top: 0
          font-size: 14px
          margin: auto 0
          color: var(--white)
          padding: 1rem 0
          display: flex
          flex-direction: column
          font-weight: bold
          span
            text-transform: uppercase
          &:before
            content: ''
            display: block
            background-image: url('images/growth/token-stack.svg')
            background-position: center
            background-size: contain
            background-repeat: no-repeat
            margin-bottom: 0.6rem
            flex: 1
      h5
        color: #94a7b5
    &.earn-tokens-card
      .main-pic
        background-image: url('images/growth/buy-promo.svg')
`)
