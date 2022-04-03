# Flight Delay Insurance Blockchain Project

This is an application project for Udacity's Blockchain course.

The Dapp is very basic. It allows a user to:
1. Request flight status from the contract (which distributes this to the registered oracles). When the oracles respond the contact emits an event with the status. Please note because the oracles respond using a random status code and I am using 40 oracles, the contract will recieve multiple reponses, these show as multiple events.

2. Buy insurance from a predefined list of Flights (in drop down list). The amount of ETH must be provided. In this example the insurance is purchased for a hardcoded Passenger address but this could easily be changed to use Metamask instead. The contract will emit a InsurancePurchased event once this completes.

## Library Versions
* Truffle v5.5.4 (core: 5.5.4)
* Ganache v^7.0.3
* Solidity - ^0.8.0 (solc-js)
* Node v16.13.1
* Web3.js v1.5.3

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`nvm use 16`

`npm install --global ganache`

`npm install`

`truffle compile`

Run ganache so it creates 100 accounts with 1000 ETH in each, setting the mnemonic here just saves time when re-running.
You need to add a .secret file into the root of the project with this mnemonic phrase as it will be loaded by truffle-config.js

`ganache -a 100 -e 1000 -m "hover manage planet acoustic raise survey impulse long ship unknown fortune twin"`

`truffle migrate`

## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`

`truffle test ./test/oracles.js`

Note: Sometimes the oracles.js tests fails to register the oracles, if you re-run it works. No idea why this is yet.

To use the dapp:

`npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server

`npm run server`

## Deploy

To build dapp for prod (this hasn't been fully tested yet):

`npm run dapp:prod`

Deploy the contents of the ./dapp folder

---
# PROJECT SPECIFICATION

## Smart Contract Seperation

Smart Contract code is separated into multiple contracts:

1) FlightSuretyData.sol for data persistence
2) FlightSuretyApp.sol for app logic and oracles code

##  Dapp Created and Used for Contract Calls

A Dapp client has been created and is used for triggering contract calls. Client can be launched with “npm run dapp” and is available at http://localhost:8000

Specific contract calls:

1) Passenger can purchase insurance for flight
2) Trigger contract to request flight status update

##  Oracle Server Application

A server app has been created for simulating oracle behavior. Server can be launched with “npm run server”

## Operational status control is implemented in contracts

implement operational status control.

## Fail Fast Contract

Contract functions “fail fast” by having a majority of “require()” calls at the beginning of function body

## Airline Contract Initialization

First airline is registered when contract is deployed.

## Multiparty Consensus

Only existing airline may register a new airline until there are at least four airlines registered

Demonstrated with Truffle test ~~~or by making call from client Dapp~~~

## Multiparty Consensus

Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines

Demonstrated with Truffle test ~~~or by making call from client Dapp~~~

## Airline Ante

Airline can be registered, but does not participate (e.g. its not approved) in contract until it submits funding of 10 ether (make sure it is not 10 wei)

Demonstrated with Truffle test ~~~or by making call from client Dapp~~~

## Passenger Airline Choice

Passengers can choose from a fixed list of flight numbers and departures that are defined in the Dapp client

Your UI implementation should include:

(The striked through items didn't make sense in the context of everything else as they suggest we should be able to register & fund airlines from the Dapp but this has been demonstrated via the truffle tests)
- ~~Fields for Airline Address and Airline Name~~ 
- ~~Amount of funds to send/which airline to send to~~
- Ability to purchase flight insurance for no more than 1 ether

## Passenger Payment

Passengers may pay up to 1 ether for purchasing flight insurance.

## Passenger Repayment

If flight is delayed due to airline fault, passenger receives credit of 1.5X the amount they paid

## Passenger Withdraw

Passenger can withdraw any funds owed to them as a result of receiving credit for insurance payout

## Insurance Payouts

Insurance payouts are not sent directly to passenger’s wallet they have to be withdrawn by the passenger

## Functioning Oracle

Oracle functionality is implemented in the server app.

## Oracle Initialization

Upon startup, 20+ oracles are registered and their assigned indexes are persisted in memory

## Oracle Updates

Update flight status requests from client Dapp result in OracleRequest event emitted by Smart Contract that is captured by server (displays on console and handled in code)

## Oracle Functionality

Server will loop through all registered oracles, identify those oracles for which the OracleRequest event applies, and respond by calling into FlightSuretyApp contract with random status code of Unknown (0), On Time (10) or Late Airline (20), Late Weather (30), Late Technical (40), or Late Other (50)

---
# Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)