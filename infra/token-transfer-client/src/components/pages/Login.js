import React, { Component } from 'react'
import { connect } from 'react-redux'

import { setSessionEmail } from '../../actions'

class Login extends Component {
  state = {
    email: '',
    emailCode: '',
    otpQrUrl: '',
    otpKey: '',
    otpCode: '',
    loginStep: 'enterEmail'
  }

  handleError = err => {
    console.error(err)
  }

  handleSendEmailCode = async () => {
    const body = new Blob(
      [JSON.stringify({ email: this.state.email }, null, 2)],
      { type: 'application/json' }
    )
    const opts = {
      method: 'POST',
      body
    }
    const serverResponse = await fetch('/api/send_email_code', opts)
    if (serverResponse.ok) {
      this.setState({ loginStep: 'checkEmail' })
    } else {
      this.handleError('Failure to send email code. Try again in a moment.')
    }
  }

  handleVerifyEmailCode = async () => {
    const body = new Blob(
      [
        JSON.stringify(
          { email: this.state.email, code: this.state.emailCode },
          null,
          2
        )
      ],
      { type: 'application/json' }
    )
    const opts = {
      method: 'POST',
      body
    }
    const serverResponse = await fetch('/api/verify_email_code', opts)
    if (!serverResponse.ok) {
      this.handleError('Invalid email code.')
      return
    }

    const response = await serverResponse.json()
    if (response.otpReady) {
      // User already setup OTP. Ask them to enter their code.
      this.setState({ loginStep: 'enterOtpCode' })
    } else {
      // User has not setup OTP yet. Call the server to get the OTP setup key.
      return this.handleOtpSetup()
    }
  }

  handleOtpSetup = async () => {
    const opts = {
      method: 'POST'
    }
    const serverReponse = await fetch('/api/setup_totp', opts)
    if (!serverReponse.ok) {
      this.handleError('OTP setup failure.')
      return
    }

    const response = await serverReponse.json()

    if (!response || !response.otpQrUrl || !response.otpKey) {
      this.handleError('OTP setup failure.')
      return
    }
    this.setState({
      loginStep: 'setupOtp',
      otpQrUrl: response.otpQrUrl,
      otpKey: response.otpKey
    })
  }

  handleOtpSetupDone = async () => {
    this.setState({ loginStep: 'enterOtpCode' })
  }

  handleVerifyOtpCode = async () => {
    const body = new Blob(
      [
        JSON.stringify(
          { email: this.state.email, code: this.state.otpCode },
          null,
          2
        )
      ],
      { type: 'application/json' }
    )
    const opts = {
      method: 'POST',
      body
    }
    fetch('/api/verify_totp', opts).then(response => {
      if (response.ok) {
        this.props.setSessionEmail(this.state.email)
      } else {
        this.handleError('Invalid OTP code.')
      }
    })
  }

  render() {
    let card
    if (this.state.loginStep === 'enterEmail') {
      card = this.renderEnterEmail()
    } else if (this.state.loginStep === 'checkEmail') {
      card = this.renderCheckEmail()
    } else if (this.state.loginStep === 'setupOtp') {
      card = this.renderSetupOtp()
    } else if (this.state.loginStep === 'enterOtpCode') {
      card = this.renderEnterOtpCode()
    }
    return <div>{card}</div>
  }

  renderEnterEmail() {
    return (
      <>
        <div className="action-card">
          <h1>Sign In</h1>
          <p>We will send you a magic link to your email to confirm access</p>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              className="form-control form-control-lg"
              id="email"
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            style={{ marginTop: '40px' }}
            onClick={this.handleSendEmailCode}
          >
            Continue
          </button>
        </div>
        <div style={{ textAlign: 'center', margin: '20px auto' }}>
          <a href="/register" style={{ color: 'white' }}>
            Don&apos;t have an account?
          </a>
        </div>
      </>
    )
  }

  renderCheckEmail() {
    return (
      <>
        <div className="action-card">
          <h1>Check your email</h1>
          <p>
            We just sent an email to {this.state.email}. Please click the link
            in the email to proceed.
          </p>
        </div>
      </>
    )
  }

  renderSetupOtp() {
    return (
      <>
        <h1>Scan QR code</h1>
        <p>Open Google Authenticator and scan the barcode or enter the key</p>
        <p>
          <strong>Secret Key:</strong>
        </p>
        <p>{this.state.otpCode}</p>
        <div className="alert">
          Store this secret key somewhere safe and don&apos;t share it with
          anyone else.
        </div>
      </>
    )
  }

  renderEnterOtpCode() {
    return (
      <>
        <div className="action-card">
          <h1>2-Step Verification</h1>
          <p>Enter the code generated by your authenticator app</p>
          <div className="form-group">
            <label htmlFor="verification-code">Verification Code</label>
            <input
              type="email"
              className="form-control"
              id="verification-code"
            />
          </div>
        </div>
      </>
    )
  }
}

const mapStateToProps = state => {
  return {
    sessionEmail: state.sessionEmail
  }
}

const mapDispatchToProps = dispatch => {
  return {
    setSessionEmail: email => dispatch(setSessionEmail(email))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Login)
