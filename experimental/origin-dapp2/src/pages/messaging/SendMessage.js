import React, { Component } from 'react'
import { Mutation } from 'react-apollo'

import mutation from 'mutations/SendMessage'
import withConfig from 'hoc/withConfig'

const acceptedFileTypes = ['image/jpeg', 'image/pjpeg', 'image/png']

async function postFile(ipfsRPC, file) {
  const body = new FormData()
  body.append('file', file)
  const rawRes = await fetch(`${ipfsRPC}/api/v0/add`, { method: 'POST', body })
  const res = await rawRes.json()
  return res.Hash
}

function fileSize(number) {
  if (number < 1024) {
    return number + 'bytes'
  } else if (number >= 1024 && number < 100000) {
    return (number / 1024).toFixed(1) + 'KB'
  } else if (number >= 100000 && number < 1048576) {
    return (number / 1024).toFixed() + 'KB'
  } else if (number >= 1048576) {
    return (number / 1048576).toFixed(1) + 'MB'
  }
}

async function getImages(config, files) {
  const { ipfsGateway, ipfsRPC } = config

  let newImages = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const hash = await postFile(ipfsRPC, file)
    if (acceptedFileTypes.indexOf(file.type) >= 0) {
      newImages.push({
        contentType: file.type,
        size: fileSize(file.size),
        name: file.name,
        url: `ipfs://${hash}`,
        urlExpanded: `${ipfsGateway}/ipfs/${hash}`,
        src: `${ipfsGateway}/ipfs/${hash}`,
        hash
      })
    }
  }
  return newImages
}

class SendMessage extends Component {
  constructor(props) {
    super(props)

    this.fileInput = React.createRef()
    this.handleClick = this.handleClick.bind(this)
    this.state = { message: '', images: '' }
  }

  componentDidMount() {
    if (this.input) {
      this.input.focus()
    }
  }

  componentDidUpdate(prevProps) {
    if (this.input && this.props.to !== prevProps.to) {
      this.input.focus()
    }
  }

  handleClick() {
    this.fileInput.current.click()
  }

  render() {
    const { to, config } = this.props
    const { images, message } = this.state
    // const shouldEnableForm = id &&
    //   origin.messaging.getRecipients(id).includes(formattedAddress(wallet.address)) &&
    //   canDeliverMessage

    return (
      <Mutation mutation={mutation}>
        {sendMessage => (
          <>
            {!true && (
              <form className="add-message d-flex">
                <textarea rows={1} tabIndex="0" disabled />
                <button type="submit" className="btn btn-sm btn-primary" disabled>
                  Send
                </button>
              </form>
            )}
            <form
              className="send-message d-flex"
              onSubmit={e => {
                e.preventDefault()
                //need to map over images and send messages...
                const content = message || images[0].src
                if (content) {
                  sendMessage({ variables: { to, content } })
                  this.setState({ message: '' })
                }
              }}
            >
              { images.length ? (
                <div className="images-preview">
                  {images.map((image) => (
                    <div key={image.hash} className="images-container">
                      <img className="img" src={image.src} />
                      <a
                        className="image-overlay-btn"
                        aria-label="Close"
                        onClick={() => this.setState({ images: [] })}
                      >
                        <span aria-hidden="true">&times;</span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : null }
              { !images.length && (
                <textarea
                  type="text"
                  placeholder="Type something..."
                  ref={input => (this.input = input)}
                  value={this.state.message}
                  onChange={e => this.setState({ message: e.target.value })}
                />
              )}
              <img
                src="images/add-photo-icon.svg"
                className="add-photo"
                role="presentation"
                onClick={this.handleClick}
              />
              <input
                type="file"
                accept="image/jpeg,image/gif,image/png"
                ref={this.fileInput}
                className="d-none"
                onChange={async e => {
                  const newImages = await getImages(
                    config,
                    e.currentTarget.files
                  )
                  this.setState({ images: newImages })
                }}
              />
              <button
                className="btn btn-sm btn-primary btn-rounded"
                type="submit"
                children="Send"
              />
            </form>
          </>
        )}
      </Mutation>
    )
  }
}

export default withConfig(SendMessage)

require('react-styl')(`
  .send-message
    border-top: 1px solid var(--pale-grey)
    padding-top: 1rem
    margin-top: 1rem
    .form-control
      margin-right: 1rem
    textarea
      background-color: transparent
      border: 0
      padding: 10px 0 0
      flex-grow: 1
      resize: none
      outline: none
    button
      margin: auto 0
      width: auto
    img
      &.add-photo
        padding: 0 10px
    .images-preview
      flex: 1
      padding: 10px 0
      .images-container
        display: inline-block
        height: 100%
        position: relative
        .img
          width: 185px
        .image-overlay-btn
          position: absolute
          top: 0
          right: 0
          cursor: pointer
          padding: 0.75rem
          line-height: 0.5
          background-color: white
          font-weight: bold
          border-bottom: 1px solid var(--light)
          opacity: 0.5
      .img
        background-position: center
        width: 100%
        background-size: contain
        background-repeat: no-repeat
`)
