import React from 'react'
import { NavLink } from 'react-router-dom'

import BorderedCard from '@/components/BorderedCard'
import Lock from '@/assets/lock-icon.svg'
import LockupGraph from './LockupGraph'
import OgnTokens from '@/assets/ogn-tokens.svg'

const BonusCard = ({
  earnings,
  isLocked,
  locked,
  lockups,
  onDisplayBonusModal
}) => {
  const renderLockupGraphs = lockups => {
    const graphs = lockups.slice(0, 3).map(lockup => {
      return (
        <div className="col" key={lockup.id}>
          <LockupGraph lockup={lockup} />
        </div>
      )
    })
    return <div className="row mt-3">{graphs}</div>
  }

  if (isLocked) {
    return (
      <BorderedCard>
        <div className="text-center">
          <OgnTokens />
          <h1 className="mt-3 mb-1">Coming Soon</h1>
          <h1>Earn Bonus Tokens</h1>
          <p>
            Place your vested tokens into lockup periods to earn even more OGN.
          </p>
        </div>
      </BorderedCard>
    )
  }

  return (
    <BorderedCard>
      <div className="hot-badge bg-red">HOT</div>
      <div className="row">
        <div className="col-12 col-sm-6">
          <h2>Bonus Tokens</h2>
          <div className="mt-3 mb-2">
            <div>Earned</div>
            <strong style={{ fontSize: '24px' }}>
              {earnings.toLocaleString()}
            </strong>{' '}
            <span className="ml-1 ogn">OGN</span>
          </div>
          <div>
            <div>Locked Up</div>
            <strong style={{ fontSize: '24px' }}>
              {locked.toLocaleString()}
            </strong>{' '}
            <span className="ml-1 ogn">OGN</span>
          </div>
        </div>
        <div className="col-12 col-sm-6 mt-4 mt-sm-0">
          <div className="row">
            <div className="col">
              <h2>Recent Lockups</h2>
            </div>
            <div className="col-4 text-right">
              <NavLink to="/lockup">Details &gt;</NavLink>
            </div>
            <div className="col-12">
              {lockups && lockups.length > 0 ? (
                renderLockupGraphs(lockups)
              ) : (
                <div className="col text-center text-muted p-4">
                  <div className="mb-4 mt-2">
                    <Lock style={{ transform: 'scale(3)' }} />
                  </div>
                  You don&apos;t have any OGN locked up.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="row mt-3">
        <div className="col text-center">
          <button
            className="btn btn-lg btn-primary"
            onClick={onDisplayBonusModal}
          >
            Earn OGN
          </button>
        </div>
      </div>
    </BorderedCard>
  )
}

export default BonusCard
