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
  address payable internal onwerAddress;
  ServiceInterface internal ServiceContract;
  mapping (uint => Product) internal products;
  address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

  constructor(address serviceContractAddress) {
    onwerAddress = payable(msg.sender);
    ServiceContract = ServiceInterface(address(serviceContractAddress));
  }

  function writeProduct(
    string memory _name,
    string memory _image,
    string memory _description, 
    string memory _location,
    uint _serviceFee,
    uint _price
  ) public {
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
  ) public {
    ServiceContract.writeService(_name, _image, _description, _location, _contact, _rate);
  }

  function readProduct(uint _index) public view returns (
    address payable owner,
    string memory name, 
    string memory image, 
    string memory description, 
    string memory location, 
    uint serviceFee,
    uint price, 
    uint sold
  ) {
    Product storage product = products[_index];
    return(
      product.owner,
      product.name,
      product.image,
      product.description,
      product.location,
      product.serviceFee,
      product.price,
      product.sold
    );
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
   uint _index,
   uint _price,
   address _serviceUser
  ) public {
    require(
      IERC20Token(cUsdTokenAddress).transferFrom(
        msg.sender,
        payable(_serviceUser),
        _price
      ),
      "Failed to hire this service."
    );

    ServiceContract.hireService(_index);
  }
  
  function buyProduct(uint _index) public payable  {
    require(
      IERC20Token(cUsdTokenAddress).transferFrom(
        msg.sender,
        onwerAddress,
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