import React, { Component, Fragment } from 'react'
import BigCalendar from 'react-big-calendar'
import { injectIntl } from 'react-intl'
import moment from 'moment'
import uuid from 'uuid/v1'
import { 
  generateCalendarSlots,
  checkSlotForExistingEvents,
  renderHourlyPrices,
  updateOriginalEvent,
  getSlotsForDateChange,
  getDateDropdownOptions,
  getRecurringEvents,
  getSlotsToReserve,
  getCleanEvents,
  getDateAvailabilityAndPrice,
  generateSlotStartEnd
} from 'utils/calendarHelpers'

class Calendar extends Component {

  constructor(props) {
    super(props)

    this.getViewType = this.getViewType.bind(this)
    this.onSelectSlot = this.onSelectSlot.bind(this)
    this.createSellerEvent = this.createSellerEvent.bind(this)
    this.handleBuyerSelection = this.handleBuyerSelection.bind(this)
    this.selectEvent = this.selectEvent.bind(this)
    this.handleEditSeriesRadioChange = this.handleEditSeriesRadioChange.bind(this)
    this.handlePriceChange = this.handlePriceChange.bind(this)
    this.saveEvent = this.saveEvent.bind(this)
    this.deleteEvent = this.deleteEvent.bind(this)
    this.cancelEvent = this.cancelEvent.bind(this)
    this.onAvailabilityChange = this.onAvailabilityChange.bind(this)
    this.onDateDropdownChange = this.onDateDropdownChange.bind(this)
    this.onIsRecurringEventChange = this.onIsRecurringEventChange.bind(this)
    this.saveData = this.saveData.bind(this)
    this.goBack = this.goBack.bind(this)
    this.reserveSlots = this.reserveSlots.bind(this)
    this.unselectSlots = this.unselectSlots.bind(this)
    this.dateCellWrapper = this.dateCellWrapper.bind(this)
    this.monthHeader = this.monthHeader.bind(this)
    this.prevPeriod = this.prevPeriod.bind(this)
    this.nextPeriod = this.nextPeriod.bind(this)
    this.slotPropGetter = this.slotPropGetter.bind(this)
    this.renderRecurringEvents = this.renderRecurringEvents.bind(this)

    this.state = {
      events: [],
      selectedEvent: {
        price: 0,
        isAvailable: true,
        isRecurringEvent: false
      },
      buyerSelectedSlotData: null,
      defaultDate: new Date(),
      showSellerActionBtns: false,
      hideRecurringEventCheckbox: false,
      editAllEventsInSeries: true,
      existingEventSelected: false,
      clickedSlotInfo: null
    }

    this.localizer = BigCalendar.momentLocalizer(moment)
  }

  componentWillMount() {
    if (this.props.slots) {
      const events = generateCalendarSlots(this.props.slots).map((slot) =>  {
        return {
          id: uuid(),
          start: moment(slot.startDate).toDate(),
          end: moment(slot.endDate).subtract(1, 'second').toDate(),
          price: slot.price && slot.price.amount && parseFloat(slot.price.amount),
          isAvailable: slot.isAvailable,
          slots: slot.slots,
          isRecurringEvent: (slot.rrule === 'FREQ=DAILY;')
        }
      })

      this.setState({
        events
      })
    }
  }

  componentDidMount() {
    renderHourlyPrices(this.props.viewType, this.props.userType)
    this.renderRecurringEvents(this.state.defaultDate)
  }

  componentDidUpdate() {
    renderHourlyPrices(this.props.viewType, this.props.userType)
  }

  getViewType() {
    return this.props.viewType === 'daily' ? 'month' : 'week'
  }

  onSelectSlot(clickedSlotInfo) {
    this.setState({ clickedSlotInfo })

    if (this.props.userType === 'seller') {
      const eventsInSlot = checkSlotForExistingEvents(clickedSlotInfo, this.state.events)

      if (eventsInSlot.length) {
        let selectedEvent

        eventsInSlot.map(event => {
          // If there's no selectedEvent, select this event
          if (!selectedEvent) {
            selectedEvent = event
            // If there's already a selectedEvent, override it if this is a non-recurring event.
            // Non-recurring events always override recurring events
          } else if (!event.isRecurringEvent) {
            selectedEvent = event
          }
        })

        this.selectEvent(selectedEvent)
      } else {
        this.createSellerEvent(clickedSlotInfo)
      }
    } else {
      // user is a buyer
      this.handleBuyerSlotSelection(clickedSlotInfo)
    } 
  }

  createSellerEvent(eventInfo, isOverrideEvent) {
    // remove last slot time for hourly calendars - not sure why React Big Calendar includes
    // the next slot after the last selected time slot - seems like a bug.
    if (this.props.viewType === 'hourly') {
      eventInfo.slots && eventInfo.slots.length && eventInfo.slots.splice(-1)
    }

    const endDate = this.props.viewType === 'daily' ?
      moment(eventInfo.end).add(1, 'day').subtract(1, 'second').toDate() :
      eventInfo.end

    const newEvent = {
      ...eventInfo,
      id: uuid(),
      end: endDate,
      allDay: false
    }

    this.setState({
      events: [
        ...this.state.events,
        newEvent
      ]
    })

    const shouldSaveEvent = isOverrideEvent ? false : true

    this.selectEvent(newEvent, shouldSaveEvent)
  }

  handleBuyerSelection(slotInfo) {
    const selectionData = []
    let slotToTest = moment(slotInfo.start)
    let hasUnavailableSlot = false
    let slotIndex = 0

    while (slotToTest.toDate() >= slotInfo.start && slotToTest.toDate() <= slotInfo.end) {
      const slotAvailData = getDateAvailabilityAndPrice(slotToTest, this.state.events)
      const { price, isAvailable, isRecurringEvent } = slotAvailData

      if (!isAvailable || moment(slotInfo.end).isBefore(moment())){
        hasUnavailableSlot = true
      }

      const slot = generateSlotStartEnd(slotInfo.start, this.props.viewType, slotIndex)

      selectionData.push({
        ...slot,
        price,
        isAvailable,
        isRecurringEvent
      })

      slotIndex++

      if (this.props.viewType === 'daily') {
        slotToTest = slotToTest.add(1, 'days')
      } else {
        slotToTest = slotToTest.add(this.props.step || 60, 'minutes').add(1, 'second')
      }
    }

    if (hasUnavailableSlot) {
      this.setState({
        selectionUnavailable: true,
        selectedEvent: {}
      })
    } else {
      const price = selectionData.reduce(
        (totalPrice, nextPrice) => totalPrice + nextPrice.price, 0
      )
      const priceFormatted = `${Number(price).toLocaleString(undefined, {
        minimumFractionDigits: 5,
        maximumFractionDigits: 5
      })}`

      this.setState({
        selectionUnavailable: false,
        selectedEvent: {
          start: slotInfo.start,
          end: slotInfo.end,
          price: priceFormatted
        },
        buyerSelectedSlotData: selectionData
      })
    }
  }

  selectEvent(selectedEvent, shouldSaveEvent) {
    const event = {
      ...selectedEvent,
      price: selectedEvent.price || '',
      isAvailable: (selectedEvent.isAvailable !== undefined ? selectedEvent.isAvailable : true),
      isRecurringEvent: selectedEvent.isRecurringEvent || false
    }

    const stateToSet = {
      selectedEvent: event
    }

    const existingEventInSlot = checkSlotForExistingEvents(selectedEvent, this.state.events)
    if (existingEventInSlot.length && existingEventInSlot.length > 1) {
      if (!selectedEvent.isRecurringEvent) {
        stateToSet.hideRecurringEventCheckbox = true
      } else {
        stateToSet.hideRecurringEventCheckbox = false
      }
    } else {
      stateToSet.hideRecurringEventCheckbox = false
    }

    if (shouldSaveEvent) {
      this.saveEvent(event)
      stateToSet.existingEventSelected = false
    } else {
      stateToSet.existingEventSelected = true
    }

    this.setState(stateToSet)
  }

  handleEditSeriesRadioChange(event) {
    const editAllEventsInSeries = event.target.value === 'true'

    if (!editAllEventsInSeries) {
      const { start, end } = generateSlotStartEnd(this.state.clickedSlotInfo.start, this.props.viewType, 0)

      this.setState({
        selectedEvent: {
          ...this.state.selectedEvent,
          start,
          end
        }
      })
    }

    this.setState({
      editAllEventsInSeries
    })
  }

  handlePriceChange(event) {
    this.setState({
      selectedEvent: {
        ...this.state.selectedEvent,
        price: (event.target.value && parseFloat(event.target.value))
      },
      showSellerActionBtns: true
    })
  }

  saveEvent(selectedEvent) {
    const thisEvent = (selectedEvent && selectedEvent.id) ? selectedEvent : this.state.selectedEvent

    if (thisEvent.isRecurringEvent && !this.state.editAllEventsInSeries) {
      const { start, end, isAvailable, price } = thisEvent
      const overrideEvent = {
        start,
        end,
        isAvailable,
        price,
        slots: [],
        isRecurringEvent: false
      }

      return this.createSellerEvent(overrideEvent, true)
    }

    const allOtherEvents = this.state.events.filter((event) => event.id !== thisEvent.id)
    const stateToSet = {
      events: [...allOtherEvents, thisEvent],
      showSellerActionBtns: false
    }

    if (thisEvent.isClonedRecurringEvent) {
      stateToSet.events = updateOriginalEvent(thisEvent, this.state.events)
    }

    this.setState(stateToSet)

    // wait for state to update, then render recurring events on monthly calendar if recurring events checkbox is checked
    setTimeout(() => {
      this.renderRecurringEvents(this.state.defaultDate)
    })
  }

  // used by seller's calendar only
  deleteEvent() {
    const confirmation = confirm('Are you sure you want to delete this event?')
    const { selectedEvent, events } = this.state

    if (confirmation) {
      let allOtherEvents

      if (selectedEvent.isRecurringEvent) {
        allOtherEvents = events.filter((event) => 
          event.id !== selectedEvent.id &&
          event.originalEventId !== selectedEvent.id &&
          event.id !== selectedEvent.originalEventId
        )
      } else {
        allOtherEvents = events.filter((event) => event.id !== selectedEvent.id)
      }

      this.setState({
        events: [...allOtherEvents],
        selectedEvent: {
          price: 0,
          isAvailable: true,
          isRecurringEvent: false
        },
        showSellerActionBtns: false
      })

      setTimeout(() => {
        this.renderRecurringEvents(this.state.defaultDate)
      })
    }
  }

  cancelEvent() {
    const unChangedEvent = this.state.events.filter((event) => event.id === this.state.selectedEvent.id)
    this.setState({
      selectedEvent: unChangedEvent[0],
      showSellerActionBtns: false
    })
  }

  onAvailabilityChange(event) {
    this.setState({
      selectedEvent: {
        ...this.state.selectedEvent,
        isAvailable: !!parseInt(!isNaN(event.target.value) && event.target.value)
      },
      showSellerActionBtns: true
    })
  }

  onDateDropdownChange(event) {
    const whichDropdown = event.target.name
    const value = event.target.value
    const selectedEvent = {
      ...this.state.selectedEvent,
      slots: getSlotsForDateChange(this.state.selectedEvent, whichDropdown, value, this.props.viewType),
      [whichDropdown]: new Date(value)
    }

    this.setState({ selectedEvent })

    if (this.props.userType === 'seller') {
      setTimeout(() => {
        this.saveEvent(this.state.selectedEvent)
      })
    } else {
      // user is buyer
      setTimeout(() => {
        this.onSelectSlot(this.state.selectedEvent)
      })
    }
  }

  onIsRecurringEventChange(event) {
    this.setState({
      selectedEvent: {
        ...this.state.selectedEvent,
        isRecurringEvent: event.target.checked
      },
      showSellerActionBtns: true
    })
  }

  dateCellWrapper(data) {
    const { value } = data
    const slotData = getDateAvailabilityAndPrice(value, this.state.events, this.props.offers)
    const availability = slotData.isAvailable ? 'available' : 'unavailable'
    const selectedSlotsMatchingDate =
      this.state.buyerSelectedSlotData &&
      this.state.buyerSelectedSlotData.filter((slot) =>
        moment(value).isBetween(moment(slot.start).subtract(1, 'second'), moment(slot.end).add(1, 'second'))
      )
    const isSelected = (selectedSlotsMatchingDate && selectedSlotsMatchingDate.length) ? ' selected' : ''

    return (
      <div className={`rbc-day-bg ${availability}${isSelected}`}>
        {slotData.isAvailable &&
          <span className="slot-price">{slotData.price ? `${slotData.price} ETH` : `0 ETH`}</span>
        }
      </div>
    )
  }

  monthHeader(data) {
    return <div className="rbc-header">{`${this.props.userType === 'buyer' ? data.label[0] : data.label}`}</div>
  }

  slotPropGetter(date) {
    const slotData = getDateAvailabilityAndPrice(date, this.state.events)
    const isAvailable = slotData.isAvailable ? 'available' : 'unavailable'
    const selectedSlotsMatchingDate = 
      this.state.buyerSelectedSlotData &&
      this.state.buyerSelectedSlotData.filter((slot) => 
        moment(date).isBetween(moment(slot.start).subtract(1, 'second'), moment(slot.end))
      )
    const isSelected = (selectedSlotsMatchingDate && selectedSlotsMatchingDate.length) ? ' selected' : ''
    const price = slotData.price ? ` priceEth-${slotData.price}` : ''
    return { className: `${isAvailable}${isSelected}${price}` }
  }

  saveData() {
    const cleanEvents = getCleanEvents(this.state.events)
    this.props.onComplete && this.props.onComplete(cleanEvents)
  }

  goBack() {
    const cleanEvents = getCleanEvents(this.state.events)
    this.props.onGoBack && this.props.onGoBack(cleanEvents)
  }

  reserveSlots() {
    const slotsToReserve = getSlotsToReserve(this.state.buyerSelectedSlotData)
    this.props.onComplete && this.props.onComplete(slotsToReserve)
  }

  unselectSlots() {
    this.setState({
      selectedEvent: {},
      buyerSelectedSlotData: null
    })
  }

  prevPeriod() {
    const date = moment(this.state.defaultDate).subtract(1, this.getViewType()).toDate()

    this.renderRecurringEvents(date)

    this.setState({
      defaultDate: date
    })
  }

  nextPeriod() {
    const date = moment(this.state.defaultDate).add(1, this.getViewType()).toDate()

    this.renderRecurringEvents(date)

    this.setState({
      defaultDate: date
    })
  }

  renderRecurringEvents(date) {
    this.setState({
      defaultDate: date,
      events: getRecurringEvents(date, this.state.events, this.props.viewType)
    })

    setTimeout(() => {
      renderHourlyPrices()
    })
  }

  render() {
    const selectedEvent = this.state.selectedEvent
    const { viewType, userType, offers } = this.props
    const { events, editAllEventsInSeries, existingEventSelected } = this.state

    return (
      <div>
        <div className="row">
          <div className={`col-md-8 
                           calendar-container
                           ${userType === 'buyer' ? ' buyer-view' : ''}
                           ${viewType === 'daily' ? ' daily-view' : ' hourly-view'}`}>
            <div className="calendar-nav">
              <img onClick={this.prevPeriod} className="prev-period" src="/images/caret-dark.svg" />
              <img onClick={this.nextPeriod} className="next-period" src="/images/caret-dark.svg" />
            </div>
            <BigCalendar
              components={{
                dateCellWrapper: this.dateCellWrapper,
                month: {
                  header: this.monthHeader
                }
              }}
              selectable={ true }
              events={ (userType === 'seller' && this.state.events) || [] }
              defaultView={ BigCalendar.Views[this.getViewType().toUpperCase()] }
              onSelectSlot={ this.onSelectSlot }
              step={ this.props.step || 60 }
              timeslots={ 1 }
              date={ this.state.defaultDate }
              onNavigate={ this.renderRecurringEvents }
              slotPropGetter={ this.slotPropGetter }
              scrollToTime={ moment(this.state.defaultDate).hour(8).toDate() }
              localizer={this.localizer}
            />
            {
              userType === 'seller' &&
              <div className="btn-container">
                <button className="btn btn-other" onClick={this.goBack}>Back</button>
                <button className="btn btn-primary" onClick={this.saveData}>Next</button>
              </div>
            }
          </div>
          <div className="col-md-4">
            {selectedEvent && selectedEvent.start &&
              <div className="calendar-cta">
                {userType === 'seller' &&
                  <span className="delete-btn" onClick={this.deleteEvent}>delete</span>
                }
                <p className="font-weight-bold">Selected { viewType === 'daily' ? 'dates' : 'times' }</p>
                <div>
                  <div className="row">
                    <div className="col-md-6">
                      <select
                        name="start"
                        className="form-control"
                        onChange={ this.onDateDropdownChange }
                        value={ selectedEvent.start.toString() }>
                        { 
                          getDateDropdownOptions(
                            selectedEvent.start,
                            viewType,
                            userType,
                            selectedEvent,
                            events,
                            offers
                          ).map((date) => (
                            ((viewType === 'daily' && date <= selectedEvent.end) ||
                            (viewType === 'hourly' && date < selectedEvent.end)) &&
                            <option
                              key={date.toString()}
                              value={date.toString()}>
                              {moment(date).format(viewType === 'daily' ? 'MM/DD/YY' : 'LT')}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="col-md-6">
                      <select
                        name="end"
                        className="form-control"
                        onChange={ this.onDateDropdownChange }
                        value={selectedEvent.end.toString()}>
                        { 
                          getDateDropdownOptions(
                            selectedEvent.end,
                            viewType,
                            userType,
                            selectedEvent,
                            events,
                            offers
                          ).map((date) => (
                            ((viewType === 'daily' && date >= selectedEvent.start) ||
                            (viewType === 'hourly' && date > selectedEvent.start)) &&
                            <option
                              key={date.toString()}
                              value={date.toString()}>
                              {moment(date).format(viewType === 'daily' ? 'MM/DD/YY' : 'LT')}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                </div>
                {userType === 'seller' &&
                  <Fragment>
                    {!this.state.hideRecurringEventCheckbox &&
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isRecurringEvent"
                          checked={ selectedEvent.isRecurringEvent }
                          onChange={ this.onIsRecurringEventChange } />
                        <label className="form-check-label" htmlFor="isRecurringEvent">
                          This is a repeating event
                        </label>
                      </div>
                    }
                    <div>
                      <p className="font-weight-bold">Availability</p>
                      <div>
                        <label htmlFor="available">
                          Availaible
                        </label>
                        <input 
                          type="radio"
                          name="isAvailable"
                          id="available"
                          value="1"
                          onChange={ this.onAvailabilityChange }
                          checked={ selectedEvent.isAvailable } />
                      </div>
                      <div>
                        <label className="form-check-label" htmlFor="unavailable">
                          Unavailable
                        </label>
                        <input
                          type="radio"
                          name="isAvailable"
                          id="unavailable"
                          value="0"
                          onChange={ this.onAvailabilityChange }
                          checked={ !selectedEvent.isAvailable } />
                      </div>
                      {selectedEvent.isAvailable &&
                        <Fragment>
                          <p className="font-weight-bold">Pricing</p>
                          <input 
                            placeholder="Price"
                            name="price"
                            type="number"
                            step="0.00001"
                            value={selectedEvent.price} 
                            onChange={this.handlePriceChange} 
                          />
                          {
                            viewType === 'hourly' &&
                            this.props.step &&
                            <span className="price-label">
                              &nbsp;ETH per hour
                            </span>
                          }
                          {viewType === 'daily' &&
                            <span className="price-label">&nbsp;ETH</span>
                          }
                        </Fragment>
                      }
                    </div>
                    {selectedEvent.isRecurringEvent && existingEventSelected &&
                      <div className="edit-series-container">
                        <label className="form-check-label" htmlFor="editAllEvents">
                          Edit all events in this series
                        </label>
                        <input
                          id="editAllEvents"
                          type="radio"
                          value={true}
                          checked={editAllEventsInSeries}
                          onChange={this.handleEditSeriesRadioChange}
                          name="editRecurringEventRadio"
                        />
                        <label className="form-check-label" htmlFor="editOnlyThisEvent">
                          Edit only this time slot
                        </label>
                        <input
                          id="editOnlyThisEvent"
                          type="radio"
                          value={false}
                          checked={!editAllEventsInSeries}
                          onChange={this.handleEditSeriesRadioChange}
                          name="editRecurringEventRadio"
                        />
                      </div>
                    }
                    {this.state.showSellerActionBtns &&
                      <div className="cta-btns row">
                        <div className="col-md-6">
                          <button className="btn btn-dark" onClick={this.cancelEvent}>Cancel</button>
                        </div>
                        <div className="col-md-6">
                          <button className="btn btn-light" onClick={this.saveEvent}>Save</button>
                        </div>
                      </div>
                    }
                  </Fragment>
                }
                {userType === 'buyer' &&
                  <div>
                    <p className="font-weight-bold">Price</p>
                    <p>{selectedEvent.price && selectedEvent.price} ETH</p>
                    {!this.props.userIsSeller &&
                      <div className="cta-btns row">
                        <div className="col-md-6">
                          <button className="btn btn-dark" onClick={this.unselectSlots}>Cancel</button>
                        </div>
                        <div className="col-md-6">
                          <button className="btn btn-light" onClick={this.reserveSlots}>Reserve</button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
            {this.state.selectionUnavailable &&
              <p className="selection-unavailable font-weight-bold">
                Your selection contains one or more unavailable time slots.
              </p>
            }
          </div>
        </div>
      </div>
    )
  }

}

export default injectIntl(Calendar)
