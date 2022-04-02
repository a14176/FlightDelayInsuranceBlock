const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = async (deployer) => {

    let firstAirline = '0xBA10d6e82d15f206f9090288B4971878B4560D5F'; // address[1] from ganache
    let firstAirlineName = 'Nicks Airline';

    await deployer.deploy(FlightSuretyData, firstAirline, firstAirlineName);
    let data = await FlightSuretyData.deployed();

    await deployer.deploy(FlightSuretyApp, data.address);
    let app = await FlightSuretyApp.deployed();

    await data.authoriseCaller(app.address);

    let config = {
        localhost: {
            url: 'http://127.0.0.1:8545',
            dataAddress: FlightSuretyData.address,
            appAddress: FlightSuretyApp.address
        }
    }
    fs.writeFileSync(__dirname + '/../src/dapp/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
    fs.writeFileSync(__dirname + '/../src/server/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
}