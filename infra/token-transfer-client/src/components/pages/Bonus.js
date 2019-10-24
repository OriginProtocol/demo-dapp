import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { bindActionCreators } from 'redux'

import { fetchLockups } from '@/actions/lockup'
import {
  getLockups,
  getTotals as getLockupTotals,
  getIsLoading as getLockupIsLoading
} from '@/reducers/lockup'
import LockupCard from '@/components/LockupCard'

const BonusTokens = props => {
  useEffect(props.fetchLockups, [])

  if (props.lockupIsLoading) {
    return (
      <div className="spinner-grow" role="status">
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  // const isLocked = moment.utc() < unlockDate

  const renderLockups = lockups => {
    return lockups.map(lockup => <LockupCard key={lockup.id} lockup={lockup} />)
  }

  return (
    <>
      <div className="row">
        <div className="col mt-4 mb-4">
          <h1>Bonus Tokens</h1>
        </div>
        <div className="col text-right">
          <button className="btn btn-lg btn-dark">Start Earning</button>
        </div>
      </div>
      <div className="row">
        <div className="col">
          Total locked up{' '}
          <strong className="ml-2">{Number(props.lockupTotals.locked)}</strong>{' '}
          <span className="ogn">OGN</span>
        </div>
        <div className="col">
          Total earned{' '}
          <strong className="ml-2">
            {Number(props.lockupTotals.earnings)}
          </strong>{' '}
          <span className="ogn">OGN</span>
        </div>
      </div>
      <hr />
      <div className="row">
        <div className="col">
          {renderLockups(props.lockups)}
          <LockupCard />
        </div>
      </div>
    </>
  )
}

const mapStateToProps = ({ lockup }) => {
  return {
    lockups: getLockups(lockup),
    lockupIsLoading: getLockupIsLoading(lockup),
    lockupTotals: getLockupTotals(lockup)
  }
}

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      fetchLockups: fetchLockups
    },
    dispatch
  )

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(BonusTokens)
)
