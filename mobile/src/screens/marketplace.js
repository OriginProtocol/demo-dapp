'use strict'

import React, { PureComponent } from 'react'
import {
  ActivityIndicator,
  Clipboard,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Linking,
  PanResponder,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  ScrollView,
  Text,
  View,
  RefreshControl,
  Dimensions
} from 'react-native'
import { AndroidBackHandler } from 'react-navigation-backhandler'
import { connect } from 'react-redux'
import { fbt } from 'fbt-runtime'
import { ShareDialog } from 'react-native-fbsdk'
import { ethers } from 'ethers'
import SafeAreaView from 'react-native-safe-area-view'
import get from 'lodash.get'
import stringify from 'json-stable-stringify'

import DeviceInfo from 'react-native-device-info'
import { NativeModules } from 'react-native'

import AuthClient from '@origin/auth-client/src/auth-client'

import OriginButton from 'components/origin-button'
import OriginWeb3View from 'components/origin-web3view'

import { DEFAULT_ANDROID_UA, DEFAULT_IOS_UA } from '../constants'
import { findBestAvailableLanguage } from 'utils/language'
import { findBestAvailableCurrency } from 'utils/currencies'
import {
  setMarketplaceReady,
  setMarketplaceWebViewError
} from 'actions/Marketplace'
import withOriginGraphql from 'hoc/withOriginGraphql'
import { PROMPT_MESSAGE, PROMPT_PUB_KEY, AUTH_MESSAGE } from '../constants'
import CommonStyles from 'styles/common'
import CardStyles from 'styles/card'
import UpdatePrompt from 'components/update-prompt'

import withConfig from 'hoc/withConfig'

class MarketplaceScreen extends PureComponent {
  static navigationOptions = () => {
    return {
      header: null
    }
  }

  constructor(props) {
    super(props)

    this.state = {
      canGoBack: false,
      enablePullToRefresh: true,
      panResponder: this.getSwipeHandler(),
      webViewRef: React.createRef(),
      injectedGetStartedRedirect: false
    }

    this.subscriptions = [
      DeviceEventEmitter.addListener('graphqlQuery', this.injectGraphqlQuery),
      DeviceEventEmitter.addListener(
        'graphqlMutation',
        this.injectGraphqlMutation
      )
    ]
  }

  componentWillUnmount = () => {
    if (this.subscriptions) {
      this.subscriptions.map(s => s.remove())
    }
  }

  componentDidUpdate = prevProps => {
    if (prevProps.settings.language !== this.props.settings.language) {
      // Language has changed
      this.injectLanguage()
    }
    // Send the user to the campaign page if given a referral code
    if (
      this.props.settings.referralCode &&
      !this.state.injectedGetStartedRedirect
    ) {
      this.injectGetStartedRedirect('/campaigns')
      this.setState({ injectedGetStartedRedirect: true })
    }
    if (prevProps.settings.currency !== this.props.settings.currency) {
      // Currency has changed
      this.injectCurrency()
    }
    if (
      get(prevProps, 'wallet.activeAccount.address') !==
      get(this.props, 'wallet.activeAccount.address')
    ) {
      // Active account changed, update messaging keys
      this.injectMessagingKeys()
      // Inject auth signature
      this.injectAuthSign()
    }

    // Open external links in native browser
    const newStateURL = get(this.props, 'navigation.state.params.dappUrl')
    const oldStateURL = get(prevProps, 'navigation.state.params.dappUrl')
    const dappUrl = get(this.props, 'settings.network.dappUrl')
    if (
      newStateURL &&
      !newStateURL.startsWith(dappUrl) &&
      newStateURL !== oldStateURL
    ) {
      this.openNativeDeepLink(newStateURL)
    }
  }

  /* Enables left and right swiping to go forward/back in the WebView on Android.
   * This is required because the allowBackForwardNavigation prop is only
   * supported on iOS.
   */
  getSwipeHandler = () => {
    if (Platform.OS === 'ios') {
      // No panHandlers required for iOS
      return { panHandlers: [] }
    }

    // Distance required to trigger a back/forward request
    const swipeDistance = 200

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return (
          Math.abs(gestureState.dx) > swipeDistance &&
          Math.abs(gestureState.dy) < 50
        )
      },
      onPanResponderRelease: (evt, gestureState) => {
        console.debug('Release')
        if (this.state.webViewRef.current) {
          if (gestureState.moveX > swipeDistance) {
            console.debug('Swipe triggered goBack')
            this.state.webViewRef.current.goBack()
          } else if (gestureState.moveX < swipeDistance) {
            console.debug('Swipe triggered goForward')
            this.state.webViewRef.current.goForward()
          }
        }
      }
    })
    return panResponder
  }

  injectJavaScript = (script, name) => {
    const injectedJavaScript = `
      (function() {
        ${script}
      })();
    `
    if (this.state.webViewRef.current) {
      console.debug(`Injecting ${name}`)
      this.state.webViewRef.current.injectJavaScript(injectedJavaScript)
    } else {
      console.debug(`Could not inject ${name}`)
    }
  }

  injectInviteCode = async () => {
    const INVITE_CODE_PREFIX = 'origin:growth_invite_code:'
    const content = await Clipboard.getString()
    if (content && content.startsWith(INVITE_CODE_PREFIX)) {
      const inviteCode = content.substr(INVITE_CODE_PREFIX.length)
      // Inject invite code
      this.injectJavaScript(
        `
          if (window && window.localStorage) {
            window.localStorage.growth_invite_code = '${inviteCode}';
          }
        `,
        'invite code'
      )
      // Clear clipboard
      Clipboard.setString('')
    }
  }

  injectGetStartedRedirect = path => {
    console.log(`injectGetStartedRedirect(${path})`)
    return this.injectJavaScript(
      `
      let uiState = typeof window.sessionStorage.uiState === 'undefined'
        ? {}
          : JSON.parse(window.sessionStorage.uiState)
      console.log('setting getStartedRedirect to ${path}')
      uiState.getStartedRedirect = { pathname: '${path}', search: '' }
      window.sessionStorage.uiState = JSON.stringify(uiState)
    `,
      'getStartedRedirect'
    )
  }

  /**
   * Signs the message using the current wallet
   * without showing a prompt to the user
   *
   * @param {String} payload Data to sign
   *
   * @returns {String|null} Signaure hex if signed, null otherwise
   */
  async signMessageWithoutPrompt(payload) {
    const { wallet } = this.props
    // No active account, can't proceed
    if (!wallet.activeAccount) {
      console.debug('Cannot sign under the hood, no active account')
      return null
    }
    // No private key (Samsung BKS account), can't proceed
    if (wallet.activeAccount.hdPath) {
      console.debug('Cannot sign under the hood for Samsung BKS account')
      return null
    }

    const { privateKey, mnemonic } = wallet.activeAccount

    let ethersWallet
    if (privateKey) {
      ethersWallet = new ethers.Wallet(privateKey)
    } else {
      ethersWallet = new ethers.Wallet.fromMnemonic(mnemonic)
    }

    // Sign and return the message
    return await ethersWallet.signMessage(payload)
  }

  /* Inject the cookies required for messaging to allow preenabling of messaging
   * for accounts
   */
  injectMessagingKeys = async () => {
    const { wallet } = this.props

    // Sign the first message
    const signature = await this.signMessageWithoutPrompt(PROMPT_MESSAGE)
    if (!signature) {
      console.debug(
        'Cannot inject messaging keys, failed to sign under the hood'
      )
      return
    }

    const signatureKey = signature.substring(0, 66)
    const msgAccount = new ethers.Wallet(signatureKey)
    const pubMessage = PROMPT_PUB_KEY + msgAccount.address
    const pubSignature = await this.signMessageWithoutPrompt(pubMessage)
    if (!pubSignature) {
      console.debug(
        'Cannot inject messaging keys, failed to sign under the hood'
      )
      return
    }

    this.injectJavaScript(
      `
        if (window && window.context && window.context.messaging) {
          window.context.messaging.onPreGenKeys({
            address: '${wallet.activeAccount.address}',
            signatureKey: '${signatureKey}',
            pubMessage: '${pubMessage}',
            pubSignature: '${pubSignature}'
          });
        }
      `,
      'messaging keys'
    )
  }

  /**
   * Inject auth signature for active wallet
   */
  injectAuthSign = async () => {
    const { wallet } = this.props

    const authClient = new AuthClient({
      authServer:
        this.props.config.authServer || 'https://auth.originprotocol.com',
      disablePersistence: true
    })

    const payload = {
      message: AUTH_MESSAGE,
      timestamp: await authClient.getServerTime()
    }

    // Sign the message
    const signature = await this.signMessageWithoutPrompt(stringify(payload))

    if (!signature) {
      console.debug(
        'Cannot inject auth signature, failed to sign under the hood'
      )
      return
    }

    this.injectJavaScript(
      `
        if (window && window.context && window.context.authClient) {
          window.context.authClient.onAuthSign(
            '${wallet.activeAccount.address}',
            '${signature}',
            JSON.parse('${JSON.stringify(payload)}')
          );
        }
      `,
      'auth sign'
    )
  }

  /* Inject the language setting in from redux into the DApp
   */
  injectLanguage = () => {
    const language = this.props.settings.language
      ? this.props.settings.language
      : findBestAvailableLanguage()

    this.injectJavaScript(
      `
        if (window && window.appComponent && window.appComponent.onLocale) {
          window.appComponent.onLocale('${language}');
        }
      `,
      'language'
    )
  }

  injectCurrency = () => {
    const currency = this.props.settings.currency
      ? this.props.settings.currency
      : findBestAvailableCurrency()

    const currencyValue = currency ? `fiat-${currency.code}` : 'fiat-USD'

    this.injectJavaScript(
      `
        if (window && window.appComponent && window.appComponent.onCurrency) {
          window.appComponent.onCurrency('${currencyValue}');
        }
      `,
      'currency'
    )
  }

  /* Inject Javascript that causes the page to refresh when it hits the top. There is a
   * special workaround implemented for the Android since scrollable modals offsets
   * are not reported by the documentElement.scrollTop. For this reason a function
   * recursively checks elements from root element down and tries to find scrollable
   * elements. And reports scrollTop on those.
   *
   * Performance considerations:
   * - tried function running through all nodes recursively. It checked up to 250 nodes and took
   *   5-30 ms on a flagship device per check.
   * - current implementation checks for node width/height (offsetWidth/offsetHeight) which is
   *   still rather resource consuming call, and early exits on nodes that take up less than
   *   half a screen width or height. Checks around 5-10 nodes per call and takes from 0-4 ms
   *   on a flagship device per check
   */
  injectScrollHandler = () => {
    this.injectJavaScript(
      `
        window.onscroll = function() {
          window.webViewBridge.send('handleScrollHandlerResponse', {
            scrollTop: document.documentElement.scrollTop || document.body.scrollTop
          });
        }

        var windowWidth = window.screen.width;
        var windowHeight = window.screen.height;

        var findScrollableChildren = function(element) {
          var excludeAbsoluteChild = false;

          if (element.parentNode.nodeType === 1 || !['body', 'html', '#document'].includes(element.parentNode.nodeName.toLowerCase())) {
            var parentCss = getComputedStyle(element.parentNode);
            excludeAbsoluteChild = parentCss.position === 'static';
          }

          var elementChildren = Array.from(element.childNodes).filter(function(child) {
            // not an elementNode
            return child.nodeType === 1;
          })

          var scrollableChildren = [].concat.apply([], (elementChildren.map(function(child) {
            return findScrollableChildren(child);
          })))

          // skip this for document node
          if (element.nodeType === 1) {
            // element too small to continue checking
            if ((element.offsetWidth < windowWidth / 2) ||
              (element.offsetHeight < windowHeight / 2)
            ) {
              return [];
            }

            var css = getComputedStyle(element);
            var overf = css.overflow.toLowerCase();
            var overfY = css.overflowY.toLowerCase();

            if ((overf === 'auto' || overf === 'scroll' || overfY === 'auto' || overfY === 'scroll') &&
              !(excludeAbsoluteChild && css.position === 'absolute')) {
              scrollableChildren.push(element);
            }
          }

          return scrollableChildren;
        };

        setInterval(function() {
          var largestScrollTop = Math.max.apply(null,
            findScrollableChildren(document.documentElement)
            .map(function(scrollable) {
                return scrollable.scrollTop;
              }
              // default value
            ).concat(document.documentElement.scrollTop || document.body.scrollTop)
          )

          window.webViewBridge.send('handleScrollHandlerResponse', {
            scrollTop: largestScrollTop
          })
        }, 500)
      `,
      'scroll handler'
    )
  }

  /* Inject a GraphQL query into the DApp using `window.gql`.
   */
  injectGraphqlQuery = (
    id,
    query,
    variables = {},
    fetchPolicy = 'cache-first'
  ) => {
    this.injectJavaScript(
      `
        if (window && window.gql) {
          window.gql.query({
            query: ${JSON.stringify(query)},
            variables: ${JSON.stringify(variables)},
            fetchPolicy: '${fetchPolicy}'
          }).then((response) => {
            window.webViewBridge.send('handleGraphqlResult', {
              id: '${id}',
              response: response
            });
          }).catch((error) => {
            window.webViewBridge.send('handleGraphqlError', {
              id: '${id}',
              error: error
            });
          });
        }
      `,
      `GraphQL query: ${query.definitions[0].name.value}`
    )
  }

  /* Inject a GraphQL mutation into the DApp using `window.gql`.
   */
  injectGraphqlMutation = (id, mutation, variables = {}) => {
    this.injectJavaScript(
      `
        if (window && window.gql) {
          window.gql.mutate({
            mutation: ${JSON.stringify(mutation)},
            variables: ${JSON.stringify(variables)}
          }).then((response) => {
            window.webViewBridge.send('handleGraphqlResult', {
              id: '${id}',
              response: response
            });
          }).catch((error) => {
            window.webViewBridge.send('handleGraphqlError', {
              id: '${id}',
              error: error
            });
          });
        }
      `,
      'GraphQL mutation'
    )
  }

  injectDeviceFingerprint = async () => {
    const screenResolution = `${Math.round(
      Dimensions.get('window').width
    )}x${Math.round(Dimensions.get('window').height)}`

    let locale

    if (Platform.OS === 'android') {
      locale = NativeModules.I18nManager.localeIdentifier
    } else if (Platform.OS === 'ios') {
      locale = NativeModules.SettingsManager.settings.AppleLocale
    }

    const fingerprint = {
      deviceId: DeviceInfo.getDeviceId(),
      brand: DeviceInfo.getBrand(),
      deviceType: DeviceInfo.getDeviceType(),
      osName: DeviceInfo.getSystemName(),
      osVersion: DeviceInfo.getSystemVersion(),
      userAgent: await DeviceInfo.getUserAgent(),
      uuid: DeviceInfo.getUniqueId(),
      ipAddress: await DeviceInfo.getIpAddress(),
      screenResolution,
      locale
    }

    // Inject device fingerprint
    this.injectJavaScript(
      `
        if (window && window.localStorage) {
          window.localStorage.deviceFingerprint = '${JSON.stringify(
            fingerprint
          )}';
        }
      `,
      'device fingerprint'
    )
  }

  requestAndroidCameraPermissions = () => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
    }
  }

  /* Attempt to open a native deep link URL on this phone. If the relevant
   * app is installed this will open it, otherwise returns false.
   */
  openNativeDeepLink = async url => {
    const canOpen = await Linking.canOpenURL(url)
    if (canOpen) {
      console.debug(`Can open URL ${url} with native application`)
      try {
        return await Linking.openURL(url)
      } catch (error) {
        console.warn('Failed opening native URL', error)
        // Return true anyway so the WebView doesn't navigate to the deep link
        return true
      }
    } else {
      console.debug(`Cannot open URL ${url} with native application`)
    }
    return false
  }

  /* Monitor the state of the WebView and if attempting to open a URL from
   * Twitter, Facebook or Telegram for sharing for Origin Rewards, attempt to
   * open the link using the native app on the phone.
   */
  attemptNativeIntercept = async url => {
    if (Platform.OS === 'android' && url.hostname === 'twitter.com') {
      // Handle Twitter links on Android (iOS handles them automatically)
      return await this.handleTwitterUrl(url)
    } else if (url.hostname.includes('facebook.com')) {
      // Facebook URLs
      return await this.handleFacebookUrl(url)
    } else if (url.hostname === 't.me') {
      // Telegram URLs
      return await this.handleTelegramUrl(url)
    }
    // The URL cannot be intercepted or failed to open native browser
    return false
  }

  /* Handle attempt to access a Twitter URL. Intercepts two types of URLs,
   * intent to tweet and intent to follow. Convert them to the equivalent
   * deep link and attempt to open in native Twitter app.
   */
  handleTwitterUrl = async url => {
    if (url.pathname === '/intent/tweet') {
      // Intent to Tweet on Android, open native deep link
      return await this.openNativeDeepLink(
        `twitter://post?message=${encodeURIComponent(
          url.searchParams.get('text')
        )}`
      )
    } else if (url.pathname === '/intent/follow') {
      // Intent to follow a twitter account on Android, open native deep link
      return await this.openNativeDeepLink(
        `twitter://user?screen_name=${url.searchParams.get('screen_name')}`
      )
    }
    return false
  }

  /* Handle attempt to access a Facebook URL. Intercepts opening Origin Protocol's
   * profile page (i.e. intent to follow) and opens it in the native Facebook app.
   * Also intercepts an intent to share Origin content and opens it in the native
   * app if the Facebook SDK is not availalbe (Android) or pops a ShareDialog
   * if it is.
   */
  handleFacebookUrl = async url => {
    if (url.pathname.toLowerCase() === '/originprotocol/') {
      // Open Facebook profile natively if possible and IOS and Android
      return await this.openNativeDeepLink(
        `fb://${Platform.OS === 'ios' ? 'profile' : 'page'}/120151672018856`
      )
    } else if (url.pathname === '/dialog/share') {
      // Facebook share action, attempt to open a dialog using the Facebook SDK
      // if possible. Fall back to the native app deep linking otherwise.
      const shareLinkContent = {
        contentType: 'link',
        contentUrl: url.searchParams.get('href')
      }

      let canShowFbShare
      try {
        canShowFbShare = await ShareDialog.canShow(shareLinkContent)
      } catch (error) {
        console.warn('ShareDialog error', error)
      }

      if (canShowFbShare) {
        ShareDialog.show(shareLinkContent)
          .then(({ isCancelled, postId }) => {
            if (isCancelled) {
              console.debug('Share cancelled by user')
            } else {
              console.debug(`Share success with postId: ${postId}`)
            }
          })
          .catch(error => {
            console.warn('ShareDialog show error', error)
          })
        return true
      } else {
        // Couldn't use Facebook SDK to show a ShareDialog, revert to deep link
        return await this.openNativeDeepLink(url.href)
      }
    }
  }

  /* Intercepts Telegram URLs and attempts to open the native Telegram app.
   */
  handleTelegramUrl = async url => {
    return await this.openNativeDeepLink(url.href)
  }

  /* Watches changes to navigation and determines if any actions should be taken.
   */
  onNavigationStateChange = async state => {
    let url
    try {
      url = new URL(state.url)
    } catch (error) {
      console.warn(`Browser reporting malformed url: ${state.url}`)
      return
    }

    this.setState({ canGoBack: state.canGoBack })

    // Request Android camera permissions if doing something that is likely
    // to need them
    try {
      if (Platform.OS === 'android') {
        if (
          // Create a listing (requires photos)
          url.hash.startsWith('#/create') ||
          // Edit a listing (may be changing photos)
          (url.hash.startsWith('#/listing') && url.hash.endsWith('/edit')) ||
          // Create or edit profile (may be changing profile image)
          url.hash.startsWith('#/profile')
        ) {
          this.requestAndroidCameraPermissions()
        }
      }
    } catch {
      /* Skip */
    }
  }

  /* Watches for requests and decides if they should be loaded or not, e.g.
   * from a click in the DApp. We prevent loading in cases where the link
   * can be handled in a native app on the phone.
   */
  onShouldStartLoadWithRequest = async request => {
    let url
    try {
      url = new URL(request.url)
    } catch (error) {
      console.warn(`Browser reporting malformed url: ${request.url}`)
    }

    const intercepted = await this.attemptNativeIntercept(url)
    if (intercepted) {
      // Returning false from this function should stop the load of the URL but
      // it does not appear to work correctly, see related issues:
      // https://github.com/react-native-community/react-native-webview/issues/772
      // https://github.com/react-native-community/react-native-webview/issues/124
      // Adding the additional stopLoading call here seems to fix this in most
      // cases
      if (this.state.webViewRef.current) {
        this.state.webViewRef.current.stopLoading()
      }
      return false
    }
    return true
  }

  /* Handle a message received via window.postMessage from the WebView.
   */
  onMessage = msg => {
    if (msg.targetFunc === 'handleGraphqlResult') {
      DeviceEventEmitter.emit('graphqlResult', msg.data)
    } else if (msg.targetFunc === 'handleGraphqlError') {
      DeviceEventEmitter.emit('graphqlError', msg.data)
    } else if (msg.targetFunc === 'handleScrollHandlerResponse') {
      this.setState({ enablePullToRefresh: msg.data.scrollTop === 0 })
    }
  }

  onLoadEnd = () => {
    // Set the language in the DApp to the same as the mobile app
    this.injectLanguage()
    // Set the currency in the DApp
    this.injectCurrency()
    // Preload messaging keys so user doesn't have to enable messaging
    this.injectMessagingKeys()
    // Inject auth signature
    this.injectAuthSign()
    // Check if a growth invie code needs to be set
    this.injectInviteCode()
    // Inject scroll handler for pull to refresh function
    if (Platform.OS === 'android') {
      this.injectScrollHandler()
    }

    // Inject device fingerprint
    this.injectDeviceFingerprint()

    // Set state to ready in redux
    this.props.setMarketplaceReady(true)
    // Make sure any error state is cleared
    this.props.setMarketplaceWebViewError(false)
  }

  /* Handle refresh requests, e.g. from the RefreshControl component.
   */
  onRefresh = () => {
    console.debug('Refresh control called refresh')
    if (Platform.OS === 'android') {
      // Workaround for broken refreshing in Android, insert a
      // time string alongside the # to force a reload
      this.injectJavaScript(
        'location.href = `/?${+ new Date()}${location.hash}`',
        'reload'
      )
    } else {
      this.injectJavaScript('document.location.reload()', 'reload')
    }
    setTimeout(() => this.setState({ refreshing: false }), 1000)
  }

  /* Handle reload requests, e.g. from the no internet error display.
   */
  onReload = () => {
    if (this.state.webViewRef.current) {
      this.state.webViewRef.current.reload()
    }
    return true
  }

  /* Handle back requests, e.g. from Android back buttons.
   */
  onBack = () => {
    if (this.state.canGoBack && this.state.webViewRef.current) {
      this.state.webViewRef.current.goBack()
      return true
    }
    return false
  }

  /* Handle an error loading the WebView
   */
  onError = syntheticEvent => {
    const { nativeEvent } = syntheticEvent
    this.props.setMarketplaceWebViewError(nativeEvent.description)
  }

  getUserAgent = () => {
    return Platform.OS === 'ios' ? DEFAULT_IOS_UA : DEFAULT_ANDROID_UA
  }

  render = () => {
    const refreshControl = (
      <RefreshControl
        enabled={this.state.enablePullToRefresh}
        refreshing={this.state.refreshing}
        onRefresh={this.onRefresh}
      />
    )

    return (
      <AndroidBackHandler onBackPress={this.onBack}>
        <UpdatePrompt />
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            behavior="padding"
            keyboardVerticalOffset={40}
            style={{ flex: 1 }}
            enabled={Platform.OS === 'android'}
          >
            <ScrollView
              contentContainerStyle={styles.container}
              refreshControl={refreshControl}
              {...this.state.panResponder.panHandlers}
            >
              {this.renderWebView()}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </AndroidBackHandler>
    )
  }

  renderWebView = () => {
    let dappUrl = this.props.settings.network.dappUrl
    if (
      typeof this.props.navigation.state.params != 'undefined' &&
      this.props.navigation.state.params.dappUrl &&
      // Do not open external links
      this.props.navigation.state.params.dappUrl.startsWith(dappUrl)
    ) {
      dappUrl = this.props.navigation.state.params.dappUrl
    }

    return (
      <OriginWeb3View
        ref={this.state.webViewRef}
        source={{ uri: dappUrl }}
        onMessage={this.onMessage}
        onLoadEnd={this.onLoadEnd}
        onError={this.onError}
        onNavigationStateChange={this.onNavigationStateChange}
        onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
        renderLoading={this.renderWebViewLoading}
        renderError={this.renderWebViewError}
        userAgent={this.getUserAgent()}
        startInLoadingState={true}
        allowsBackForwardNavigationGestures={true} // iOS support only
        decelerationRate="normal"
      />
    )
  }

  renderWebViewLoading = () => {
    return (
      <View style={styles.webviewLoadingOrError}>
        <ActivityIndicator size="large" color="black" />
      </View>
    )
  }

  renderWebViewError = () => {
    return (
      <SafeAreaView style={styles.webviewLoadingOrError}>
        <View style={styles.content}>
          <Text style={styles.title}>
            <fbt desc="MarketplaceScreen.heading">Connection Error</fbt>
          </Text>
          <Text style={styles.subtitle}>
            <fbt desc="NoInternetError.errorText">
              An error occurred loading the Origin Marketplace. Please check
              your internet connection.
            </fbt>
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <OriginButton
            size="large"
            type="primary"
            title={fbt('Retry', 'MarketplaceScreen.retryButton')}
            onPress={this.onReload}
          />
          <OriginButton
            size="large"
            type="link"
            title={fbt('Settings', 'MarketplaceScreen.errorSettingsButton')}
            onPress={() => this.props.navigation.navigate('Settings')}
          />
        </View>
      </SafeAreaView>
    )
  }
}

const mapStateToProps = ({ wallet, settings }) => {
  return { wallet, settings }
}

const mapDispatchToProps = dispatch => ({
  setMarketplaceReady: ready => dispatch(setMarketplaceReady(ready)),
  setMarketplaceWebViewError: error =>
    dispatch(setMarketplaceWebViewError(error))
})

export default withConfig(
  withOriginGraphql(
    connect(mapStateToProps, mapDispatchToProps)(MarketplaceScreen)
  )
)

const styles = StyleSheet.create({
  webviewLoadingOrError: {
    position: 'absolute',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    backgroundColor: 'white'
  },
  ...CommonStyles,
  ...CardStyles
})
