const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require('web3');
const fs = require('fs');


const rpcUrl = 'http://localhost:8545'
const mnemonic = fs.readFileSync(".secret").toString().trim();


// let provider = new HDWalletProvider({
//   mnemonic: mnemonic,
//   providerOrUrl: "http://127.0.0.1:7545/",
//   addressIndex: 0,
//   numberOfAddresses: 50
// });

module.exports = {
  networks: {
    develop1: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },

    development: {
      provider: function () {
        const wsProvider = new Web3.providers.WebsocketProvider(rpcUrl);
        HDWalletProvider.prototype.on = wsProvider.on.bind(wsProvider);
        return new HDWalletProvider(mnemonic, wsProvider,0,50);
      },
      //provider: () => new HDWalletProvider(mnemonic, new Web3.providers.WebsocketProvider('http://127.0.0.1:8545'), 0, 50),
      network_id: '*',
      gas: 4500000,
      gasPrice: 10000000000,
      websockets: true,
      disableConfirmationListener: true,
      networkCheckTimeout:10000
    }
  },
  compilers: {
    solc: {
      version: "^0.8.0",
    }
  }
};