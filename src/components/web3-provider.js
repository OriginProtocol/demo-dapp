import React, { Component, Fragment } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router'

import Modal from './modal'

import origin from '../services/origin'
import Store from '../Store'
import { storeWeb3Account, storeWeb3Intent } from '../actions/App'

const web3 = origin.contractService.web3
const productionHostname = process.env.PRODUCTION_DOMAIN || 'demo.originprotocol.com'

const networkNames = {
  1: 'Main',
  2: 'Morden',
  3: 'Ropsten',
  4: 'Rinkeby',
  42: 'Kovan',
  999: 'Localhost',
}
const supportedNetworkIds = [3, 4]
const ONE_SECOND = 1000
const ONE_MINUTE = ONE_SECOND * 60

// TODO (micah): potentially add a loading indicator
const Loading = () => null

const NotWeb3EnabledDesktop = props => (
  <Modal backdrop="static" data-modal="account-unavailable" isOpen={true}>
    <div className="image-container">
      <img src="images/flat_cross_icon.svg" role="presentation" />
    </div>
    <div>In order to {props.web3Intent}, you must install MetaMask.</div>
    <br />
    <a target="_blank" href="https://metamask.io/">Get MetaMask</a><br />
    <a target="_blank" href="https://medium.com/originprotocol/origin-demo-dapp-is-now-live-on-testnet-835ae201c58">
      Full Instructions for Demo
    </a><br />
    <a onClick={() => props.storeWeb3Intent(null)}>
      Return to Origin
    </a>
  </Modal>
)

const NotWeb3EnabledMobile = props => (
  <Modal backdrop="static" data-modal="account-unavailable" isOpen={true}>
    <div className="image-container">
      <img src="images/flat_cross_icon.svg" role="presentation" />
    </div>
    <div>In order to {props.web3Intent}, you must use an Ethereum wallet-enabled browser.</div>
    <br />
    <div><strong>Popular Ethereum Wallets</strong></div>
    <div><a href="https://trustwalletapp.com/" target="_blank">Trust</a></div>
    <div><a href="https://www.cipherbrowser.com/" target="_blank">Cipher</a></div>
    <div><a href="https://www.toshi.org/" target="_blank">Toshi</a></div>
    <br />
    <a onClick={() => props.storeWeb3Intent(null)}>
      Return to Origin
    </a>
  </Modal>
)

const NoWeb3Account = props => (
  <Modal backdrop="static" data-modal="account-unavailable" isOpen={true}>
    <div className="image-container">
      <img src="images/flat_cross_icon.svg" role="presentation" />
    </div>
    <div>In order to {props.web3Intent}, you must sign in to MetaMask.</div>
    <a onClick={() => props.storeWeb3Intent(null)}>
      Return to Origin
    </a>
  </Modal>
)

const UnconnectedNetwork = () => (
  <Modal backdrop="static" data-modal="web3-unavailable" isOpen={true}>
    <div className="image-container">
      <img src="images/flat_cross_icon.svg" role="presentation" />
    </div>
    Connecting to network...
  </Modal>
)

const UnsupportedNetwork = props => (
  <Modal backdrop="static" data-modal="web3-unavailable" isOpen={true}>
    <div className="image-container">
      <img src="images/flat_cross_icon.svg" role="presentation" />
    </div>
    <span>{ (props.onMobile) ? "Your wallet-enabled browser" : "MetaMask" } should be on <strong>Rinkeby</strong> Network<br /></span>
    Currently on {props.currentNetworkName}.
  </Modal>
)

const Web3Unavailable = props => (
  <Modal backdrop="static" data-modal="web3-unavailable" isOpen={true}>
    <div className="image-container">
      <img src="images/flat_cross_icon.svg" role="presentation" />
    </div>
    {(!props.onMobile || (props.onMobile === "Android")) &&
      <div>Please install the MetaMask extension<br />to access this site.<br />
        <a target="_blank" href="https://metamask.io/">Get MetaMask</a><br />
        <a target="_blank" href="https://medium.com/originprotocol/origin-demo-dapp-is-now-live-on-testnet-835ae201c58">
          Full Instructions for Demo
        </a>
      </div>
    }
    {(props.onMobile && (props.onMobile !== "Android")) &&
      <div>Please access this site through <br />a wallet-enabled browser:<br />
        <a target="_blank" href="https://itunes.apple.com/us/app/toshi-ethereum/id1278383455">Toshi</a>&nbsp;&nbsp;|&nbsp;
        <a target="_blank" href="https://itunes.apple.com/us/app/cipher-browser-ethereum/id1294572970">Cipher</a>&nbsp;&nbsp;|&nbsp;
        <a target="_blank" href="https://itunes.apple.com/ae/app/trust-ethereum-wallet/id1288339409">Trust Wallet</a>
      </div>
    }
  </Modal>
)

class Web3Provider extends Component {
  constructor(props) {
    super(props)

    this.accountsInterval = null
    this.networkInterval = null
    this.fetchAccounts = this.fetchAccounts.bind(this)
    this.fetchNetwork = this.fetchNetwork.bind(this)
    this.state = {
      networkConnected: null,
      networkId: null,
      networkError: null,
      provider: null,
    }
  }

  componentWillMount() {
    this.setState({ provider: web3.currentProvider })
  }

  /**
   * Start polling network. We poll indefinitely so that we can
   * react to the user changing networks.
   */
  componentDidMount() {
    this.fetchAccounts()
    this.fetchNetwork()
    this.initAccountsPoll()
    this.initNetworkPoll()
  }

  /**
   * Init web3/account polling, and prevent duplicate interval.
   * @return {void}
   */
  initAccountsPoll() {
    if (!this.accountsInterval) {
      this.accountsInterval = setInterval(this.fetchAccounts, ONE_SECOND)
    }
  }

  /**
   * Init network polling, and prevent duplicate intervals.
   * @return {void}
   */
  initNetworkPoll() {
    if (!this.networkInterval) {
      this.networkInterval = setInterval(this.fetchNetwork, ONE_MINUTE)
    }
  }

  /**
   * Update state regarding the availability of web3 and an ETH account.
   * @return {void}
   */
  fetchAccounts() {
    web3.eth.getAccounts((err, accounts) => {
      if (err) {
        console.error(err)
      } else {
        this.handleAccounts(accounts)
      }
    })
  }

  /**
   * Get the network and update state accordingly.
   * @return {void}
   */
  fetchNetwork() {
    let called = false

    web3.currentProvider &&
      web3.version &&
      web3.eth.net.getId((err, netId) => {
        called = true

        const networkId = parseInt(netId, 10)

        if (err) {
          this.setState({
            networkError: err
          })
        } else {
          if (networkId !== this.state.networkId) {
            this.setState({
              networkError: null,
              networkId
            })
          }
        }

        if (!this.state.networkConnected) {
          this.setState({
            networkConnected: true
          })
        }
      })

    // Delay and condition the use of the network value.
    // https://github.com/MetaMask/metamask-extension/issues/1380#issuecomment-375980850
    if (this.state.networkConnected === null) {
      setTimeout(() => {
        !called &&
          web3 &&
          web3.version &&
          (web3.version.network === 'loading' || !web3.version.network) &&
          this.setState({
            networkConnected: false
          })
      }, 4000)
    }
  }

  handleAccounts(accounts) {
    let curr = accounts[0]
    let prev = this.props.web3Account

    if (curr !== prev) {
      this.props.storeWeb3Account(curr)

      // force reload on account change
      prev !== null && window.location.reload()
    }
  }

  render() {
    const { onMobile, web3Account, web3Intent, storeWeb3Intent } = this.props
    const { networkConnected, networkId, provider } = this.state
    const currentNetworkName = networkNames[networkId]
      ? networkNames[networkId]
      : networkId
    const inProductionEnv = window.location.hostname === productionHostname
    const networkNotSupported = supportedNetworkIds.indexOf(networkId) < 0

    return (
      <Fragment>

        { /* provider should always be present */
          !provider &&
          <Web3Unavailable onMobile={onMobile} />
        }

        { /* networkConnected initial state is null */
          provider &&
          networkConnected === false &&
          <UnconnectedNetwork />
        }

        { /* production  */
          provider &&
          networkId &&
          inProductionEnv &&
          networkNotSupported &&
          <UnsupportedNetwork currentNetworkName={currentNetworkName} onMobile={onMobile} />
        }

        { /* attempting to use web3 in unsupported mobile browser */
          web3Intent &&
          !web3.givenProvider &&
          onMobile &&
          <NotWeb3EnabledMobile web3Intent={web3Intent} storeWeb3Intent={storeWeb3Intent} />
        }

        { /* attempting to use web3 in unsupported desktop browser */
          web3Intent &&
          !web3.givenProvider &&
          !onMobile &&
          <NotWeb3EnabledDesktop web3Intent={web3Intent} storeWeb3Intent={storeWeb3Intent} />
        }

        { /* attempting to use web3 without being signed in */
          web3Intent &&
          web3.givenProvider &&
          web3Account === undefined &&
          <NoWeb3Account web3Intent={web3Intent} storeWeb3Intent={storeWeb3Intent} />
        }

        {this.props.children}

      </Fragment>
    )
  }
}

const mapStateToProps = state => {
  return {
    web3Account: state.app.web3.account,
    web3Intent: state.app.web3.intent,
    onMobile: state.app.onMobile,
  }
}

const mapDispatchToProps = dispatch => ({
  storeWeb3Account: addr => dispatch(storeWeb3Account(addr)),
  storeWeb3Intent: intent => dispatch(storeWeb3Intent(intent)),
})

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Web3Provider))
