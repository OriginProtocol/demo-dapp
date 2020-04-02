import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import BigNumber from 'bignumber.js'
import get from 'lodash.get'
import ReactGA from 'react-ga'
import moment from 'moment'

import { addLockup } from '@/actions/lockup'
import {
  getError as getLockupsError,
  getIsAdding as getLockupIsAdding
} from '@/reducers/lockup'
import { formInput, formFeedback } from '@/utils/formHelpers'
import Modal from '@/components/Modal'
import BonusGraph from '@/components/BonusGraph'
import ModalStep from '@/components/ModalStep'

import EmailIcon from '@/assets/email-icon.svg'
import GoogleAuthenticatorIcon from '@/assets/google-authenticator.svg'
import OgnIcon from '@/assets/ogn-icon.svg'
import YieldIcon from '@/assets/yield-icon.svg'
import TokensIcon from '@/assets/tokens-icon.svg'
import ClockIcon from '@/assets/clock-icon.svg'
import CalendarIcon from '@/assets/calendar-icon.svg'

class BonusModal extends Component {
  constructor(props) {
    super(props)
    this.state = this.getInitialState()
  }

  componentDidMount() {
    ReactGA.modalview(`/lockup/${this.state.modalState.toLowerCase()}`)
  }

  componentDidUpdate(prevProps, prevState) {
    // Parse server errors for account add
    if (get(prevProps, 'lockupError') !== this.props.lockupError) {
      this.handleServerError(this.props.lockupError)
    }

    if (prevState.modalState !== this.state.modalState) {
      ReactGA.modalview(`/lockup/${this.state.modalState.toLowerCase()}`)
    }
  }

  handleServerError(error) {
    if (error && error.status === 422) {
      // Parse validation errors from API
      if (error.response.body && error.response.body.errors) {
        error.response.body.errors.forEach(e => {
          this.setState({ [`${e.param}Error`]: e.msg })
        })
      } else {
        console.error(error.response.body)
      }
    }
  }

  getInitialState = () => {
    const initialState = {
      amount: this.props.balance ? Number(this.props.balance) : 0,
      amountError: null,
      code: '',
      codeError: null,
      modalState: 'Disclaimer'
    }

    return initialState
  }

  handleModalClose = () => {
    // Reset the state of the modal back to defaults
    this.setState(this.getInitialState())
    if (this.props.onModalClose) {
      this.props.onModalClose()
    }
  }

  handleFormSubmit = () => {
    event.preventDefault()

    if (BigNumber(this.state.amount).isGreaterThan(this.props.balance)) {
      this.setState({
        amountError: `Lock up amount is greater than your balance of ${Number(
          this.props.balance
        ).toLocaleString()} OGN`
      })
      return
    }

    if (BigNumber(this.state.amount).isLessThan(100)) {
      this.setState({
        amountError: `Lock up amount must be at least 100 OGN`
      })
      return
    }

    this.setState({ modalState: 'TwoFactor' })
  }

  handleTwoFactorFormSubmit = async event => {
    event.preventDefault()

    // Add the lockup
    const result = await this.props.addLockup({
      amount: this.state.amount,
      code: this.state.code,
      early: this.props.isEarlyLockup
    })

    if (result.type === 'ADD_LOCKUP_SUCCESS') {
      this.setState({ modalState: 'CheckEmail' })
    }
  }

  onMaxAmount = event => {
    event.preventDefault()

    this.setState({
      amount: Number(this.props.balance)
    })
  }

  render() {
    return (
      <Modal
        appendToId="private"
        onClose={this.handleModalClose}
        closeBtn={true}
        className="large-header"
      >
        {this.state.modalState === 'Disclaimer' && this.renderDisclaimer()}
        {this.state.modalState === 'Form' && this.renderForm()}
        {this.state.modalState === 'TwoFactor' && this.renderTwoFactor()}
        {this.state.modalState === 'CheckEmail' && this.renderCheckEmail()}
      </Modal>
    )
  }

  renderForm() {
    const input = formInput(this.state, state => this.setState(state))
    const Feedback = formFeedback(this.state)

    return (
      <div className="text-left">
        {this.renderTitle()}
        <hr />
        <form onSubmit={this.handleFormSubmit}>
          <div className="row">
            <div className="col-7 pr-4">
              {this.props.isEarlyLockup && (
                <div className="form-group">
                  <label htmlFor="amount">Eligible tokens</label>
                  <div className="faux-input form-control form-control-lg">
                    <strong>
                      {Number(this.props.nextVest.amount).toLocaleString()} OGN
                    </strong>{' '}
                    vest on {moment(this.props.nextVest.date).format('L')}
                  </div>
                </div>
              )}
              <div className="form-group">
                <label htmlFor="amount">Amount of tokens to lock up</label>
                <div
                  className={`input-group ${
                    this.state.amountError ? 'is-invalid' : ''
                  }`}
                >
                  <input {...input('amount')} type="number" />
                  <div className="input-group-append">
                    <a
                      href="#"
                      onClick={this.onMaxAmount}
                      className="mr-2"
                      style={{
                        color: '#007cff',
                        fontSize: '14px',
                        textDecoration: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Max
                    </a>
                    <span className="badge badge-secondary">OGN</span>
                  </div>
                </div>
                <div
                  className={this.state.amountError ? 'input-group-fix' : ''}
                >
                  {Feedback('amount')}
                </div>
              </div>
            </div>

            <div className="col-5 pl-3 pt-4">
              <BonusGraph
                lockupAmount={this.state.amount}
                bonusRate={this.props.lockupBonusRate}
              />
            </div>
          </div>

          <div className="actions">
            <div className="row">
              <div className="col">
                <button
                  className="btn btn-outline-primary btn-lg"
                  onClick={() => this.setState({ modalState: 'Disclaimer' })}
                >
                  Back
                </button>
              </div>
              <div className="col text-center">
                <ModalStep steps={3} completedSteps={1} />
              </div>
              <div className="col text-right">
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={!this.state.amount || this.props.lockupIsAdding}
                >
                  {this.props.lockupIsAdding ? (
                    <>Loading...</>
                  ) : (
                    <span>Continue</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    )
  }

  renderTitle() {
    let titleText
    if (this.props.isEarlyLockup) {
      titleText = `Special offer for ${moment(this.props.nextVest.date).format(
        'MMMM'
      )} vesting`
    } else {
      titleText = 'Earn Bonus Tokens'
    }
    return (
      <div className="row text-center align-items-center text-sm-left mb-3">
        <div className="col-12 col-sm-2 text-center">
          <OgnIcon className="icon-xl" />
        </div>
        <div className="col">
          <h1 className="mb-2">{titleText}</h1>
        </div>
      </div>
    )
  }

  renderDisclaimer() {
    return (
      <div className="text-left">
        {this.renderTitle()}

        <hr />

        <div className="row text-center align-items-center text-sm-left my-3">
          <div className="col-12 col-sm-1 mr-sm-4 text-center my-3">
            <YieldIcon className="mx-3" />
          </div>
          <div className="col">
            {this.props.isEarlyLockup ? (
              <>
                Earn <strong>{this.props.lockupBonusRate}%</strong> bonus tokens
                immediately by locking up your{' '}
                {moment(this.props.nextVest.date).format('MMMM')} vest
              </>
            ) : (
              <>
                Earn <strong>{this.props.lockupBonusRate}%</strong> bonus tokens
                immediately by locking up vested tokens
              </>
            )}
          </div>
        </div>

        <hr />

        <div className="row text-center align-items-center text-sm-left my-3">
          <div className="col-12 col-sm-1 mr-sm-4 text-center my-3">
            <CalendarIcon className="mx-3" />
          </div>
          <div className="col">
            All tokens will be available for withdrawal after{' '}
            <strong>1 year</strong>
          </div>
        </div>

        <hr />

        {this.props.isEarlyLockup ? (
          <>
            <div className="row text-center align-items-center text-sm-left my-3">
              <div className="col-12 col-sm-1 mr-sm-4 text-center my-3">
                <TokensIcon className="mx-3" />
              </div>
              <div className="col">
                <strong>
                  {Number(this.props.nextVest.amount).toLocaleString()}
                </strong>{' '}
                OGN are scheduled to vest in{' '}
                {moment(this.props.nextVest.date).format('MMMM')}
              </div>
            </div>
            <hr />
            <div className="row text-center align-items-center text-sm-left my-3">
              <div className="col-12 col-sm-1 mr-sm-4 text-center my-3">
                <ClockIcon className="mx-3" />
              </div>
              <div className="col">
                This offer expires in{' '}
                <strong>
                  {moment(this.props.enabledUntil).diff(moment(), 'days')}d{' '}
                  {moment(this.props.enabledUntil).diff(moment(), 'hours') % 24}
                  h{' '}
                  {moment(this.props.enabledUntil).diff(moment(), 'minutes') %
                    60}
                  m
                </strong>
              </div>
            </div>
          </>
        ) : (
          <div className="row text-center align-items-center text-sm-left my-3">
            <div className="col-12 col-sm-1 mr-sm-4 text-center my-3">
              <TokensIcon className="mx-3" />
            </div>
            <div className="col">
              This program is only available to our existing Advisor, Strategic,
              and CoinList investors. Thank you for your early support of
              Origin.
            </div>
          </div>
        )}

        <div className="actions">
          <div className="row">
            <div className="col-7 align-self-center">
              <small>
                By continuing you certify that you are an{' '}
                <a
                  href="https://www.investor.gov/additional-resources/news-alerts/alerts-bulletins/updated-investor-bulletin-accredited-investors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  accredited investor
                </a>
              </small>
            </div>
            <div className="col-5 text-right">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => this.setState({ modalState: 'Form' })}
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  renderTwoFactor() {
    const input = formInput(
      this.state,
      state => this.setState(state),
      'text-center w-auto'
    )
    const Feedback = formFeedback(this.state)

    return (
      <>
        <GoogleAuthenticatorIcon className="mb-4" width="74" height="74" />
        <h1 className="mb-2">Enter your verification code</h1>
        <p className="text-muted">
          Enter the code generated by your authenticator app
        </p>
        <form onSubmit={this.handleTwoFactorFormSubmit}>
          <div className="form-group mb-5">
            <label htmlFor="code">Verification code</label>
            <input {...input('code')} placeholder="Enter code" type="number" />
            {Feedback('code')}
          </div>
          <div className="actions">
            <div className="row">
              <div className="col text-left">
                <button
                  className="btn btn-outline-primary btn-lg"
                  onClick={() => this.setState({ modalState: 'Form' })}
                >
                  Back
                </button>
              </div>
              <div className="col text-center">
                <ModalStep steps={3} completedSteps={2} />
              </div>
              <div className="col text-right">
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={this.props.lockupIsAdding}
                >
                  {this.props.lockupIsAdding ? (
                    'Loading...'
                  ) : (
                    <span>Verify</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </>
    )
  }

  renderCheckEmail() {
    return (
      <>
        <div className="mt-5 mb-3">
          <EmailIcon />
        </div>
        <h1 className="mb-2">Please check your email</h1>
        <p className="text-muted">
          Click the link in the email we just sent you
        </p>
        <div className="actions">
          <div className="row">
            <div className="col"></div>
            <div className="col text-center">
              <ModalStep steps={3} completedSteps={3} />
            </div>
            <div className="col text-right">
              <button
                className="btn btn-primary btn-lg"
                onClick={this.handleModalClose}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }
}

const mapStateToProps = ({ lockup }) => {
  return {
    lockupError: getLockupsError(lockup),
    lockupIsAdding: getLockupIsAdding(lockup)
  }
}

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      addLockup: addLockup
    },
    dispatch
  )

export default connect(mapStateToProps, mapDispatchToProps)(BonusModal)
