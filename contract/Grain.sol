// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import './GrainService.sol';


contract Grain {

    struct Product {
        address payable owner;
        string name;
        string image;
        string description;
        string location;
        uint serviceFee;
        uint price;
        uint sold;
    }

    uint internal productsLength = 0;
    address payable internal ownerAddress;
    ServiceInterface internal ServiceContract;
    mapping (uint => Product) internal products;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    constructor(address serviceContractAddress) {
        ownerAddress = payable(msg.sender);
        ServiceContract = ServiceInterface(address(serviceContractAddress));
    }


    modifier checkInputs(
        string memory _name,
        string memory _image,
        string memory _description, 
        string memory _location
    ) {
        require(bytes(_name).length > 0, "Enter a valid name");
        require(bytes(_image).length > 0, "Enter a valid image url");
        require(bytes(_description).length > 0, "Enter a valid description");
        require(bytes(_location).length > 0, "Enter a valid location");
        _;
    }

    function writeProduct(
        string memory _name,
        string memory _image,
        string memory _description, 
        string memory _location,
        uint _serviceFee,
        uint _price
    ) public checkInputs(_name, _image, _description, _location) {
        require(_serviceFee > 0, "Enter a valid service fee");
        require(_price > 0, "Enter a valid price");
        uint _sold = 0;
        products[productsLength] = Product(
        payable(msg.sender),
        _name,
        _image,
        _description,
        _location,
        _serviceFee,
        _price,
        _sold
        );
        productsLength++;
    }

    function addService(
        string memory _name,
        string memory _image,
        string memory _description, 
        string memory _location,
        string memory _contact,
        uint _rate
    ) public checkInputs(_name, _image, _description, _location) {
        require(bytes(_contact).length > 9, "Enter a valid contact info"); // ensures that either a valid email or phone number format is entered
        require(_rate > 0, "Enter a valid rate");
        ServiceContract.writeService(_name, _image, _description, _location, _contact, _rate);
    }

    function readProduct(uint _index) public view returns (Product memory) {
        Product storage product = products[_index];
        return product;
    }

    function getService(uint _index) public view returns(
        address user,
        string memory name, 
        string memory image, 
        string memory description, 
        string memory location, 
        string memory contact,
        uint rate,
        uint hiresLength
    ) {
        return ServiceContract.readService(_index);
    }

    function getServiceHire(uint _serviceIndex, uint _hireIndex) public view returns(
        address hirer,
        uint timestamp
    ) {
        return ServiceContract.readServiceHire(_serviceIndex, _hireIndex);
    }
        
    // hire a service
    function hireService(
        uint _index
    ) public payable {
        (address user,,,,,, uint rate,) = ServiceContract.readService(_index); // the remaining returned values are not assigned
        if(rate > 0) {
            require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                user,
                rate
            ),
            "Failed to hire this service."
            );
        }

        ServiceContract.hireService(_index);
    }
    
    function buyProduct(uint _index) public payable  {
        require(_index < productsLength, "Enter a valid index");
        require(msg.sender != products[_index].owner, "You can't buy your own product");
        require(
        IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            ownerAddress,
            products[_index].serviceFee
        ),
        "Product fee transfer failed."
        );
        require(
        IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            products[_index].owner,
            products[_index].price
        ),
        "Product price transfer failed."
        );
        products[_index].sold++;
    }
    
    function getProductsLength() public view returns (uint) {
        return (productsLength);
    }

    function getServicesLength() public view returns (uint) {
        return ServiceContract.readServicesLength();
    }
}