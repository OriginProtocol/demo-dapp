import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import get from 'lodash/get'
import queryString from 'query-string'
import { fbt } from 'fbt-runtime'

import { getStateFromQuery } from './_filters'

import withConfig from 'hoc/withConfig'
import withIsMobile from 'hoc/withIsMobile'

class Search extends Component {
  constructor(props) {
    super(props)
    this.state = {
      ...getStateFromQuery(props),
      active: false
    }
  }

  render() {
    return this.renderContent()
  }

  renderContent() {
    const enabled = get(this.props, 'config.discovery', false)
    const { placeholder, className, showDropdown, isMobile } = this.props

    return (
      <form
        className={`listing-search-wrapper${className ? ' ' + className : ''}${
          showDropdown ? ' with-dropdown' : ''
        }${this.state.active ? ' fullscreen' : ''}`}
        onSubmit={e => {
          e.preventDefault()
          this.doSearch()
        }}
      >
        <div className="search-input-wrapper">
          <div className="search-input">
            <input
              ref={ref => (this.inputRef = ref)}
              className={`form-control${
                !this.state.searchInput ? ' empty' : ''
              }`}
              type="input"
              value={this.state.searchInput}
              onChange={e => this.setState({ searchInput: e.target.value })}
              onFocus={() =>
                this.setState({ active: isMobile && showDropdown })
              }
              onKeyUp={e => {
                if (e.keyCode === 13) this.doSearch()
              }}
              onInput={e => {
                // When 'clear' button is clicked
                if (e.target.value === '') {
                  this.setState({ searchInput: '' }, () => this.doSearch())
                }
              }}
              placeholder={
                enabled
                  ? placeholder
                    ? 'Search'
                    : null
                  : fbt('Note: Search unavailable', 'search.search-unavailable')
              }
            />
            {isMobile && showDropdown && this.state.active && (
              <button
                className="cancel-button"
                onClick={() => {
                  this.setState({ active: false })
                }}
              />
            )}
          </div>
          {this.renderSearchDropdown()}
        </div>
      </form>
    )
  }

  renderSearchDropdown() {
    if (!this.props.showDropdown) {
      return null
    }

    const { isMobile } = this.props

    return (
      // tabIndex to keep the focus on click
      <div
        className={`search-dropdown${isMobile ? '' : ' floating'}`}
        tabIndex={isMobile ? -1 : 0}
      >
        {!isMobile && (
          <div className="title">
            <fbt desc="Search.Categories">CATEGORIES</fbt>
          </div>
        )}
        <div className="featured-categories">
          <div
            className="category-icon apparel"
            onClick={() => this.onCategoryClick('apparel')}
          >
            <fbt desc="Search.Apparel">Apparel</fbt>
          </div>
          <div
            className="category-icon gift-cards"
            onClick={() => this.onCategoryClick('gift-card')}
          >
            <fbt desc="Search.GiftCards">Gift Cards</fbt>
          </div>
          <div
            className="category-icon housing"
            onClick={() => this.onCategoryClick('housing')}
          >
            <fbt desc="Search.Housing">Housing</fbt>
          </div>
          <div
            className="category-icon services"
            onClick={() => this.onCategoryClick('services')}
          >
            <fbt desc="Search.Services">Services</fbt>
          </div>
          <div
            className="category-icon art"
            onClick={() => this.onCategoryClick('art')}
          >
            <fbt desc="Search.Art">Art</fbt>
          </div>
        </div>
      </div>
    )
  }

  onCategoryClick(category) {
    this.setState(
      {
        category: {
          type: category
        }
      },
      () => this.doSearch()
    )
  }

  doSearch() {
    const search = this.state
    this.props.history.push({
      pathname: '/search',
      search: queryString.stringify({
        q: search.searchInput || undefined,
        category: search.category.type || undefined,
        priceMin: search.priceMin || undefined,
        priceMax: search.priceMax || undefined
      })
    })
    this.setState({
      active: false
    })
    this.inputRef.blur()
  }
}

export default withIsMobile(withConfig(withRouter(Search)))

require('react-styl')(`
  .listing-search-wrapper.with-dropdown
    .search-input-wrapper
      position: relative
      width: 100%
      .search-input
        display: flex
      .form-control
        border-radius: 5px
        flex: auto 1 1
      .cancel-button
        flex: 40px 0 0
        height: auto
        background-color: white
        display: inline-block
        background-image: url('images/nav/close-icon.svg')
        background-repeat: no-repeat
        background-position: center right
        border: 0

      .search-dropdown
        background-color: var(--white)
        padding: 1.5rem
        display: none
        &.floating
          z-index: 1000
          position: absolute
          right: 0
          left: 0
          border-top-left-radius: 0
          border-top-right-radius: 0
          border-bottom-left-radius: 5px
          border-bottom-right-radius: 5px
          box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1)
          border: solid 1px #c2cbd3
          border-top: 0
        .title
          font-size: 12px
          color: var(--dusk)
          margin-bottom: 0.5rem
        
        .featured-categories
          display: inline-flex
          overflow-x: scroll
          width: 100%
          flex-wrap: nowrap
          .category-icon
            width: 60px
            flex: auto 0 0
            margin: 0 5px 5px 5px
            text-align: center
            color: var(--dark)
            font-size: 0.6rem
            text-overflow: ellipsis
            cursor: pointer

            &:first-child
              margin-left: 0

            &:before
              content: ''
              display: inline-block
              width: 60px
              height: 60px
              background-color: #f0f6f9
              border-radius: 50%
              background-repeat: no-repeat
              background-position: center

            &.apparel:before
              background-image: url('images/categories/apparel-icon.svg')
            &.gift-cards:before
              background-image: url('images/categories/gift-card-icon.svg')
            &.housing:before
              background-image: url('images/categories/housing-icon.svg')
            &.services:before
              background-image: url('images/categories/services-icon.svg')
            &.art:before
              background-image: url('images/categories/art-icon.svg')
    
    &:focus-within
      .form-control
        border-bottom-left-radius: 0
        border-bottom-right-radius: 0
        box-shadow: none
        outline: none
      .search-input-wrapper .search-dropdown.floating
        display: block
        &:focus
          box-shadow: none
          outline: none

    &.fullscreen
      position: fixed
      top: 0
      bottom: 0
      right: 0
      left: 0
      padding: 1.5rem
      background-color: white
      z-index: 1000
      .search-input-wrapper
        .search-dropdown
          padding: 1.5rem 0
          display: block


  .navbar
    .listing-search-wrapper
      max-width: 350px
      flex: 1
      margin-left: 1rem
      .form-control
        background: url(images/magnifying-glass.svg) no-repeat right 10px center
        border-color: #c2cbd3
        width: 100%
  .listings-container
    .listing-search-wrapper
      .form-control
        font-size: 22px
        border: 0
        border-bottom: 1px solid #dde6ea
        background-image: url(images/magnifying-glass.svg)
        background-repeat: no-repeat
        background-position: right 0 center
        background-size: 20px
        border-radius: 0
        padding-left: 0

        &::-webkit-input-placeholder
          color: #94a7b5
        &:focus
          box-shadow: none

`)
