
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    const TEN_ETHER = web3.utils.toWei("10", "ether");
    const ONE_ETHER = web3.utils.toWei("1", "ether");

    const AIRLINE_2 = accounts[2];
    const AIRLINE_3 = accounts[3];
    const AIRLINE_4 = accounts[4];
    const AIRLINE_5 = accounts[5];
    const AIRLINE_6 = accounts[6];

    const PAX_1 = accounts[7];
    const PAX_2 = accounts[8];

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authoriseCaller(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSurety.setTestingMode(true);
        }
        catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it('(airline) can register Airline using registerAirline() but its not approved if it is not funded', async () => {

        // ACT
        try {
            //console.log("config.firstAirline= ",config.firstAirline);
            await config.flightSuretyApp.registerAirline(AIRLINE_2, "AIRLINE_2", { from: config.firstAirline });
        }
        catch (e) {
            console.error(e.message);
        }
        let isRegisteredAirline = await config.flightSuretyData.isRegisteredAirline.call(AIRLINE_2);

        let isApprovedAirline = await config.flightSuretyData.isApprovedAirline.call(AIRLINE_2);

        // ASSERT
        assert.equal(isRegisteredAirline, true, "Airline should be able to register");
        assert.equal(isApprovedAirline, false, "Airline should not be able to register an approved airline if it hasn't provided funding");

    });

    it("(airline) can register an approved Airline after funded enough", async () => {
        // the airline needs to supply its own funds
        // airline 2 was registered to the queue in the previous test case
        await config.flightSuretyApp.fundAirline({ from: AIRLINE_2, value: TEN_ETHER });

        const result = await config.flightSuretyData.isApprovedAirline.call(AIRLINE_2);

        // ASSERT
        assert.equal(result, true, "Airline should be able to register another airline if it has provided funding");
    });

    it("multi-party consensus is required to approve an airline after 4 airlines are approved", async () => {

        //the first 4 airlines do not require voting consensus
        await config.flightSuretyApp.registerAirline(AIRLINE_3, "AIRLINE_3", { from: config.firstAirline });
        await config.flightSuretyApp.fundAirline({ from: AIRLINE_3, value: TEN_ETHER });

        await config.flightSuretyApp.registerAirline(AIRLINE_4, "AIRLINE_4", { from: config.firstAirline });
        await config.flightSuretyApp.fundAirline({ from: AIRLINE_4, value: TEN_ETHER });

        // Register 5th airline
        await config.flightSuretyApp.registerAirline(AIRLINE_5, "AIRLINE_5", { from: config.firstAirline });
        await config.flightSuretyApp.fundAirline({ from: AIRLINE_5, value: TEN_ETHER });
        const isApprovedAirline = await config.flightSuretyData.isApprovedAirline.call(AIRLINE_5);

        // ASSERT
        assert.equal(isApprovedAirline, false, "Airline should not be approved without voting consensus.");
    });

    it("AIRLINE_5 cannot vote/participate yet as its not approved", async () => {

        // AIRLINE_5 is already registered and funded as per previous test
        //  5th airline votes for itself
        let success = false;
        try {
            await config.flightSuretyApp.voteAirline(AIRLINE_5, { from: AIRLINE_5 });
            success = await config.flightSuretyData.isApprovedAirline.call(AIRLINE_5);
        } catch (e) {
            //console.log(e);
            success = false;
        }
        // ASSERT
        assert.equal(success, false, "AIRLINE_5 should not be able to vote/participate yet as its not approved");
    });

    it("Airline cannot vote twice for a registered airline", async () => {

        let success = false;
        try {
            // 2 votes from same airline should be rejected
            await config.flightSuretyApp.voteAirline(AIRLINE_5, { from: config.firstAirline });
            await config.flightSuretyApp.voteAirline(AIRLINE_5, { from: config.firstAirline });
            success = await config.flightSuretyData.isApprovedAirline.call(AIRLINE_5);
        } catch (e) {
            //console.log(e);
            success = false;
        }
        // ASSERT
        assert.equal(success, false, "Airline should not be able to vote twice for a registered airline");
    });

    it("multi-party consensus is required to approve an airline after 4 airlines are approved", async () => {

        // 2 votes from 4 should approve airline 5, already has one vote from previous test
        await config.flightSuretyApp.voteAirline(AIRLINE_5, { from: AIRLINE_2 });
        //console.log('voted');
        const isApprovedAirline = await config.flightSuretyData.isApprovedAirline.call(AIRLINE_5);
        //console.log('isApprovedAirline:', isApprovedAirline);
        const getApprovedAirlinesCount = await config.flightSuretyData.getApprovedAirlinesCount.call();
        //console.log('getApprovedAirlinesCount:', getApprovedAirlinesCount);

        // ASSERT
        assert.equal(isApprovedAirline, true, "Airline should be approved as voting consensus is 50% of approved airlines.");
        assert.equal(getApprovedAirlinesCount, 5, "There should be 5 approved airlines.");
    });


    it("multi-party consensus - 2 airlines from 5 cannot approve an airline as its below 50% threshold", async () => {
        // Register 6th airline
        await config.flightSuretyApp.registerAirline(AIRLINE_6, "AIRLINE_6", { from: config.firstAirline });
        await config.flightSuretyApp.fundAirline({ from: AIRLINE_6, value: TEN_ETHER });

        // 2 votes from 5 IS NOT ENOUGH TO approve airline 6
        await config.flightSuretyApp.voteAirline(AIRLINE_6, { from: config.firstAirline });
        await config.flightSuretyApp.voteAirline(AIRLINE_6, { from: AIRLINE_2 });

        const isApprovedAirline = await config.flightSuretyData.isApprovedAirline.call(AIRLINE_6);
        const getApprovedAirlinesCount = await config.flightSuretyData.getApprovedAirlinesCount.call();

        // ASSERT
        assert.equal(isApprovedAirline, false, "Airline should NOT be approved as voting consensus is 50% of approved airlines.");
        assert.equal(getApprovedAirlinesCount, 5, "There should be 5 approved airlines.");
    });


    it("buy insurance for a flight", async () => {
        let flightNo = "ABC123";
        let timestamp = Math.floor(Date.now() / 1000);

        let purchased = true;

        try {
            await config.flightSuretyApp.buyInsurance(AIRLINE_2, flightNo, timestamp, { from: PAX_1, value: ONE_ETHER });
        } catch (e) {
            //console.error(e);
            purchased = false;
        }

        assert.equal(purchased, true, "Unable to purchase insurance");


        let getPaxInsurance = 0;

        try {

            getPaxInsurance = await config.flightSuretyData.getPaxInsurance(AIRLINE_2, flightNo, timestamp, PAX_1);
            console.log("getPaxInsurance=" + getPaxInsurance);
        } catch (e) {
            console.error(e);
        }

        assert.equal(getPaxInsurance.premiumValue, ONE_ETHER, "Premium does not match");
    });

    it("buy insurance for a flight with too much ETH", async () => {
        let flightNo = "ABC125";
        let timestamp = Math.floor(Date.now() / 1000);

        let purchased = true;

        try {
            await config.flightSuretyApp.buyInsurance(AIRLINE_3, flightNo, timestamp, { from: PAX_1, value: TEN_ETHER });
        } catch (e) {
            //console.error(e);
            purchased = false;
        }

        assert.equal(purchased, false, "Should not be able to purchase insurance with so much ETH");

    });

    it("test insurance creditInsurees for delayed flight", async () => {
        let flightNo = "ABC126";
        let timestamp = Math.floor(Date.now() / 1000);
        let amt = 0;
        let airline = AIRLINE_2;
        let pax = PAX_2;

        try {
            await config.flightSuretyApp.buyInsurance(airline, flightNo, timestamp, { from: pax, value: ONE_ETHER });

            let getPaxInsurance = await config.flightSuretyData.getPaxInsurance(airline, flightNo, timestamp, pax);
            console.log("getPaxInsurance=" + getPaxInsurance);

            // added so we can call the creditInsurees (this is simpler to run test)
            await config.flightSuretyData.authoriseCaller(accounts[0]);
            await config.flightSuretyData.creditInsurees(airline, flightNo, timestamp);

            amt = await config.flightSuretyData.getPaxInsurancePayoutAvailable(pax);
            console.log("getPaxInsurancePayoutAvailable=" + amt);
        } catch (e) {
            console.error(e);
            amt = 0;
        }

        assert.equal(amt > 0, true, "payout failed");

    });

    it("test insurance withdraw for delayed flight", async () => {
        let flightNo = "ABC127";
        let timestamp = Math.floor(Date.now() / 1000);
        let amt = -1;
        let airline = AIRLINE_2;
        let pax = PAX_2;

        try {
            await config.flightSuretyApp.buyInsurance(airline, flightNo, timestamp, { from: pax, value: ONE_ETHER });

            let getPaxInsurance = await config.flightSuretyData.getPaxInsurance(airline, flightNo, timestamp, pax);
            console.log("getPaxInsurance=" + getPaxInsurance);

            // added so we can call the creditInsurees
            await config.flightSuretyData.authoriseCaller(accounts[0]);
            await config.flightSuretyData.creditInsurees(airline, flightNo, timestamp);

            amt = await config.flightSuretyData.getPaxInsurancePayoutAvailable(pax);
            console.log("getPaxInsurancePayoutAvailable=" + amt);

            await config.flightSuretyApp.paxWithdrawPayout({ from: pax });

            amt = await config.flightSuretyData.getPaxInsurancePayoutAvailable(pax);
            console.log("payout after withdraw=" + amt);

            //check balance of pax to see if they have the funds

        } catch (e) {
            console.error(e);
            amt = -1;
        }

        assert.equal(amt == 0, true, "payout failed");

    });


});
