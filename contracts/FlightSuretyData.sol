// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../node_modules/openzeppelin-solidity/contracts/utils/math/SafeMath.sol";
import "../node_modules/openzeppelin-solidity/contracts/utils/structs/EnumerableSet.sol";

contract FlightSuretyData {
    using SafeMath for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // maps the authoised calling contract addresses, used so only the app contract can call the functions
    mapping(address => bool) private authorisedContracts;

    address private contractOwner; // Account used to deploy contract
    address private firstAirline; // the first airline

    bool private operational = true; // Blocks all state changes throughout the contract if false

    // represents a Passengers insurance policy for a flight
    struct PaxInsurance {
        uint256 premiumValue;
        address paxAddress;
        string flightNo;
        bool paidOut;
    }

    // represents an airline and its state
    struct Airline {
        string name;
        bool isFunded; // indicates the airline has funded the appropriate amount
        bool isVoted; // this indicates the airline has been voted in via the multi-party consensus
        bool isApproved; // indicates this airline is approved to particpate in the insurance contract
        uint256 fundedValue; // value funded
        address[] voters; // list of addresses that have voted for this airline
    }

    // a queue of airline addresses waiting to get funded and approved
    EnumerableSet.AddressSet private registerAirlineQueue;

    // a set of airline addresses that are fully approved to particpate in the insurance contract
    EnumerableSet.AddressSet private approvedAirlines;

    // maps Airlines
    mapping(address => Airline) private airlines;

    // maps flightKey to an array of PaxInsurance
    mapping(bytes32 => PaxInsurance[]) private paxInsurancePolicies;

    // maps the paxAddress to a Payout amount they are due
    mapping(address => uint256) private paxInsurancePayouts;

    uint256 private constant INSURANCE_PAYOUT = 150; // will divide by 100 in  calc
    uint256 private constant AIRLINE_FUND = 10 ether;
    uint256 private constant PAX_INSURANCE_LIMIT = 1 ether;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event AirlineApproved(address airlineAddress, string name);

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor(address airlineAddress, string memory airlineName) {
        contractOwner = msg.sender;
        firstAirline = airlineAddress;
        // add the first airline
        EnumerableSet.add(approvedAirlines, airlineAddress);
        //approvedAirlines.add(airlineAddress);
        airlines[airlineAddress] = Airline({
            name: airlineName,
            isFunded: true,
            isVoted: true,
            isApproved: true,
            fundedValue: 0,
            voters: new address[](0)
        });
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsRegisteredAirline(address _airlineAddress) {
        require(
            EnumerableSet.contains(registerAirlineQueue, _airlineAddress),
            "Caller is not in the registration queue"
        );
        _;
    }

    modifier requireIsApprovedAirline(address _airlineAddress) {
        require(
            EnumerableSet.contains(approvedAirlines, _airlineAddress),
            "Caller is not an approved airline"
        );
        _;
    }

    modifier requireAuthorisedContract() {
        require(
            authorisedContracts[msg.sender],
            "Caller is not an authorized contract"
        );
        _;
    }

    modifier requireNewAirline(address _airlineAddress) {
        require(
            !(EnumerableSet.contains(registerAirlineQueue, _airlineAddress) ||
                EnumerableSet.contains(approvedAirlines, _airlineAddress)),
            "Caller is already an airline"
        );
        _;
    }

    modifier requireAirline(address _airlineAddress) {
        require(
            (EnumerableSet.contains(registerAirlineQueue, _airlineAddress) ||
                EnumerableSet.contains(approvedAirlines, _airlineAddress)),
            "Caller is not an airline"
        );
        _;
    }

    modifier requireUniqueVote(
        address _airlineAddress,
        address _fromAirlineAddress
    ) {
        require(
            this.isUniqueVote(_airlineAddress, _fromAirlineAddress),
            "Caller has already voted for this airline"
        );
        _;
    }

    modifier requireInsuranceLimit() {
        require(
            msg.value <= PAX_INSURANCE_LIMIT,
            "Insurance paid is higher than the limit"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() external view returns (bool) {
        return operational;
    }

    function isUniqueVote(
        address _forAirlineAddress,
        address _fromAirlineAddress
    )
        external
        view
        requireIsOperational
        requireAuthorisedContract
        returns (bool)
    {
        for (
            uint256 idx = 0;
            idx < airlines[_forAirlineAddress].voters.length;
            idx++
        ) {
            if (
                _fromAirlineAddress == airlines[_forAirlineAddress].voters[idx]
            ) {
                return false;
            }
        }
        return true;
    }

    function getApprovedAirlinesCount() external view returns (uint256) {
        return EnumerableSet.length(approvedAirlines);
    }

    function isAirline(address airlineAddress) external view returns (bool) {
        return
            EnumerableSet.contains(registerAirlineQueue, airlineAddress) ||
            EnumerableSet.contains(approvedAirlines, airlineAddress);
    }

    function isApprovedAirline(address airlineAddress)
        external
        view
        returns (bool)
    {
        return EnumerableSet.contains(approvedAirlines, airlineAddress);
    }

    function isRegisteredAirline(address airlineAddress)
        external
        view
        returns (bool)
    {
        return EnumerableSet.contains(registerAirlineQueue, airlineAddress);
    }

    function isPaxInsurancePayoutAvailable(address pax)
        external
        view
        returns (bool)
    {
        return paxInsurancePayouts[pax] > 0;
    }

    function getPaxInsurancePayoutAvailable(address pax)
        external
        view
        returns (uint256)
    {
        return paxInsurancePayouts[pax];
    }

    // only used for testing otherwise would be internal
    function getPaxInsurance(
        address airlineAddress,
        string memory flight,
        uint256 timestamp,
        address paxAddress
    ) external view requireIsOperational returns (PaxInsurance memory) {
        bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);

        PaxInsurance[] memory insPolicies = paxInsurancePolicies[flightKey];

        for (uint256 index = 0; index < insPolicies.length; index++) {
            PaxInsurance memory insPolicy = insPolicies[index];
            if (insPolicy.paxAddress == paxAddress) {
                return insPolicy;
            }
        }
        return
            PaxInsurance({
                premiumValue: 0,
                paxAddress: address(0),
                flightNo: "",
                paidOut: false
            });
    }

    function getPaxInsurancePolicySize(
        address airlineAddress,
        string memory flight,
        uint256 timestamp
    ) external view requireIsOperational returns (uint256) {
        bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);

        PaxInsurance[] memory insPolicies = paxInsurancePolicies[flightKey];
        return insPolicies.length;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    // sets which contracts can call functions on this contract, used to set the App contract address
    function authoriseCaller(address contractAddress)
        external
        requireContractOwner
    {
        authorisedContracts[contractAddress] = true;
    }

    function deauthoriseCaller(address contractAddress)
        external
        requireContractOwner
    {
        delete authorisedContracts[contractAddress];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(
        address _airlineAddress,
        string memory _name,
        bool _isVotedOveride
    )
        external
        requireIsOperational
        requireAuthorisedContract
        requireNewAirline(_airlineAddress)
    {
        // not sure i need to use this register queue
        EnumerableSet.add(registerAirlineQueue, _airlineAddress);

        airlines[_airlineAddress] = Airline({
            name: _name,
            isFunded: false,
            isVoted: _isVotedOveride,
            isApproved: false,
            fundedValue: 0,
            voters: new address[](0)
        });
    }

    // checks status of airline and updates if it now meets the requirements
    function updateAirlineStatus(address airlineAddress) internal {
        if (
            !airlines[airlineAddress].isApproved &&
            airlines[airlineAddress].isFunded &&
            airlines[airlineAddress].isVoted
        ) {
            airlines[airlineAddress].isApproved = true;
            EnumerableSet.add(approvedAirlines, airlineAddress);
            EnumerableSet.remove(registerAirlineQueue, airlineAddress);

            emit AirlineApproved(airlineAddress, airlines[airlineAddress].name);
        }
    }

    function voteAirline(
        address _forAirlineAddress,
        address _fromAirlineAddress
    ) external requireAuthorisedContract requireIsOperational {
        // add their vote
        airlines[_forAirlineAddress].voters.push(_fromAirlineAddress);

        // div function torounds down so need to add the remainder via mod for this to work
        if (
            airlines[_forAirlineAddress].voters.length >=
            (EnumerableSet.length(approvedAirlines).div(2) +
                EnumerableSet.length(approvedAirlines).mod(2))
        ) {
            airlines[_forAirlineAddress].isVoted = true;
            updateAirlineStatus(_forAirlineAddress);
        }
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(
        address paxAddress,
        uint256 amount,
        address airlineAddress,
        string calldata flightNo,
        uint256 timestamp
    ) external payable requireAuthorisedContract requireIsOperational {
        require(amount > 0, "Did not send any amount.");

        bytes32 flightKey = getFlightKey(airlineAddress, flightNo, timestamp);

        //Add pax insurance for the flight
        PaxInsurance memory pi = PaxInsurance({
            premiumValue: amount,
            paxAddress: paxAddress,
            flightNo: flightNo,
            paidOut: false
        });
        paxInsurancePolicies[flightKey].push(pi);
    }

    /**
     *  @dev Credits payouts to insurees
     */

    function creditInsurees(
        address airlineAddress,
        string memory flight,
        uint256 timestamp
    ) external requireIsOperational requireAuthorisedContract {
        bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);

        PaxInsurance[] memory insPolicies = paxInsurancePolicies[flightKey];

        for (uint256 index = 0; index < insPolicies.length; index++) {
            PaxInsurance memory insPolicy = insPolicies[index];
            if (insPolicy.paidOut == false) {
                // calc payout
                uint256 payoutValue = insPolicy
                    .premiumValue
                    .mul(INSURANCE_PAYOUT)
                    .div(100);
                insPolicy.paidOut = true;
                paxInsurancePayouts[insPolicy.paxAddress] = paxInsurancePayouts[
                    insPolicy.paxAddress
                ].add(payoutValue);
            }
        }
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(address _paxAddress)
        external
        payable
        requireIsOperational
        requireAuthorisedContract
        returns (uint256 amt)
    {
        require(
            paxInsurancePayouts[_paxAddress] > 0,
            "No payouts exist for withdrawing"
        );

        uint256 amount = paxInsurancePayouts[_paxAddress];

        if (amount > 0) {
            paxInsurancePayouts[_paxAddress] = 0;

            payable(_paxAddress).transfer(amount);
        }
        return amount;
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address _airlineAddress, uint256 amount)
        external
        payable
        requireIsOperational
        requireAuthorisedContract
        requireAirline(_airlineAddress)
    {
        require(amount > 0, "Did not send any funds.");

        airlines[_airlineAddress].fundedValue = airlines[_airlineAddress]
            .fundedValue
            .add(amount);
        if (airlines[_airlineAddress].fundedValue >= AIRLINE_FUND) {
            airlines[_airlineAddress].isFunded = true;
            updateAirlineStatus(_airlineAddress);
        }
    }

    /**
     *  @dev generates a flight key
     *
     */
    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    fallback() external payable {
        //fund();
    }

    receive() external payable {
        //fund();
    }
}
