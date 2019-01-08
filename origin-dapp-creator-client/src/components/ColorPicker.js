'use strict'

import React from 'react'

import { SketchPicker } from 'react-color'

class ColorPicker extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      displayColorPicker: false,
      color: {
        r: 241,
        g: 112,
        b: 19,
        a: 1,
      }
    }

    this.handleClick = this.handleClick.bind(this)
    this.handleClose = this.handleClose.bind(this)
    this.handleChange = this.handleChange.bind(this)
  }

  handleClick () {
    this.setState({ displayColorPicker: !this.state.displayColorPicker })
  }

  handleClose () {
    this.setState({ displayColorPicker: false })
  }

  handleChange (color) {
    this.setState({ color: color.rgb })
  }

  colorStyle () {
    return {
      background: `rgba(
        ${ this.state.color.r },
        ${ this.state.color.g },
        ${ this.state.color.b },
        ${ this.state.color.a }
      )`
    }
  }

  render () {
    return (
      <div>
        <div class="wrapper">
          <div className="swatch" onClick={this.handleClick}>
            <div className="color" style={this.colorStyle()} />
          </div>
          <div className="description">{this.props.description}</div>
        </div>
        { this.state.displayColorPicker ? <div className="popover">
          <div className="cover" onClick={this.handleClose} />
          <SketchPicker color={this.state.color} onChange={this.handleChange} />
        </div> : null }
      </div>
    )
  }
}

export default ColorPicker

require('react-styl')(`
  .wrapper
    display: flex
    margin-bottom: 0.75rem

  .color
    width: 100%
    height: 100%

  .swatch
    width: 40px;
    height: 40px;
    padding: 7px
    background: var(--pale-grey-four)
    cursor: pointer
    border: 1px solid var(--light)
    border-radius: var(--default-radius)

  .cover
    position: fixed
    top: 0
    right: 0
    bottom: 0
    left: 0

  .popover
    position: absolute
    z-index: 2

  .description
    color: var(--dark)
    font-size: 1.125rem
    margin-left: 0.5rem
    margin-top: 0.5rem
`)
