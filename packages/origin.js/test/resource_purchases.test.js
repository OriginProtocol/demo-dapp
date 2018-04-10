import { expect } from "chai"
import Listings from "../src/resources/listings.js"
import Purchase from "../src/resources/purchases.js"
import ContractService from "../src/contract-service.js"
import IpfsService from "../src/ipfs-service.js"
import Web3 from "web3"

describe("Purchase Resource", function() {
  this.timeout(5000) // default is 2000

  var listings
  var listing
  var purchases
  var purchase
  var contractService
  var ipfsService
  var testListingIds
  var web3

  before(async () => {
    let provider = new Web3.providers.HttpProvider("http://localhost:9545")
    web3 = new Web3(provider)
    contractService = new ContractService({ web3 })
    ipfsService = new IpfsService()
    listings = new Listings({ contractService, ipfsService })
    purchases = new Purchase({ contractService, ipfsService })
  })

  let resetListingAndPurchase = async () => {
    // Create a new listing and a new purchase for the tests to use.
    const listingData = {
      name: "Australorp Rooser",
      category: "For Sale",
      location: "Atlanta, GA",
      description:
        "Peaceful and dignified, Australorps are an absolutely delightful bird which we highly recommend to anyone who wants a pet chicken that lays dependably.",
      pictures: undefined,
      price: 0.2
    }
    const schema = "for-sale"
    const listingTransaction = await listings.create(listingData, schema)
    const listingEvent = listingTransaction.logs.find(
      e => e.event == "NewListing"
    )
    listing = await listings.getByIndex(listingEvent.args._index)

    // Buy listing to create a purchase
    const purchaseTransaction = await listings.buy(
      listing.address,
      1,
      listing.price - 0.1
    )
    const purchaseEvent = purchaseTransaction.logs.find(
      e => e.event == "ListingPurchased"
    )
    purchase = await purchases.get(purchaseEvent.args._purchaseContract)
  }

  describe("simple purchase flow", async () => {
    before(async () => {
      await resetListingAndPurchase()
    })

    it("should get a purchase", async () => {
      expect(purchase.stage.toNumber()).to.equal(0)
      expect(purchase.listingAddress).to.equal(listing.address)
      expect(purchase.buyerAddress).to.equal(
        await contractService.currentAccount()
      )
    })

    it("should allow the buyer to pay", async () => {
      expect(purchase.stage.toNumber()).to.equal(0)
      await purchases.pay(
        purchase.address,
        contractService.web3.toWei("0.1", "ether")
      )
      purchase = await purchases.get(purchase.address)
      expect(purchase.stage.toNumber()).to.equal(1)
    })

    it("should allow the seller to mark as shipped", async () => {
      // Not implimented on the contract yet
    })

    it("should allow the buyer to mark a purchase received", async () => {
      expect(purchase.stage.toNumber()).to.equal(1)
      await purchases.buyerConfirmReceipt(purchase.address)
      purchase = await purchases.get(purchase.address)
      expect(purchase.stage.toNumber()).to.equal(2)
    })

    it("should allow the seller to collect money", async () => {})
  })
})
