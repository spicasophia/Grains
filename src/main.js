import Web3 from 'web3'
import { newKitFromWeb3 } from '@celo/contractkit'
import BigNumber from "bignumber.js"
import grainAbi from '../contract/grain.abi.json'
import erc20Abi from "../contract/erc20.abi.json"

const ERC20_DECIMALS = 18;
const GrainContractAddress = "0xdbde85Cc347b6853D134eE83E2002D847510E080";
const erc20Address = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

let kit, contract;
let products = [], services = [];


const connectCeloWallet = async function () {
  if (window.celo) {
      notification("⚠️ Please approve this DApp to use it.")
      serviceNotificationOff()
    try {
      await window.celo.enable()
      notificationOff()
      serviceNotificationOff()

      const web3 = new Web3(window.celo)
      kit = newKitFromWeb3(web3)

      const accounts = await kit.web3.eth.getAccounts()
      kit.defaultAccount = accounts[0]

      contract = new kit.web3.eth.Contract(grainAbi, GrainContractAddress)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.")
    serviceNotificationOff()
  }
}

async function paymentApproval(_price) {
  const ERCContract = new kit.web3.eth.Contract(erc20Abi, erc20Address)

  const result = await ERCContract.methods.approve(GrainContractAddress, _price).send({
    from: kit.defaultAccount
  })

  return result
}


const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
  document.querySelector("#balance").textContent = cUSDBalance
}

const getProducts = async function() {
  const _productsLength = await contract.methods.getProductsLength().call()
  document.querySelector("#equipmentCounts").textContent = _productsLength;

  const _products = []
    for (let i = 0; i < _productsLength; i++) {
    let _product = new Promise(async (resolve, reject) => {
      let p = await contract.methods.readProduct(i).call()
      resolve({
        index: i,
        owner: p.owner,
        name: p.name,
        image: p.image,
        description: p.description,
        location: p.location,
        fee: new BigNumber(p.serviceFee),
        price: new BigNumber(p.price),
        sold: p.sold
      })
    })
    _products.push(_product)
  }
  products = await Promise.all(_products)
  renderProducts()
}
const getServiceHires = async function (serviceIndex, hiresLength) {
  const _hires = [];
  for (let index = 0; index < hiresLength; index++) {
    let _hire = new Promise(async (resolve, reject) => {
      await contract.methods.getServiceHire(serviceIndex, index).call().then((h) => {
        resolve({
          index: index,
          hirer: h.hirer,
          timestamp: new Date(h.timestamp * 1000).toUTCString()
        })
      })
    });
    _hires.push(_hire)
  }
  return await Promise.all(_hires)
}

const getServices = async function() {
  const _servicesLength = await contract.methods.getServicesLength().call()
  document.querySelector("#trainersCounts").textContent = _servicesLength + ' services';

  const _services = []
    for (let i = 0; i < _servicesLength; i++) {
    let _service = new Promise(async (resolve, reject) => {
      let s = await contract.methods.getService(i).call()

      resolve({
        index: i,
        user: s.user,
        name: s.name,
        image: s.image,
        description: s.description,
        location: s.location,
        contact: s.contact,
        rate: new BigNumber(s.rate),
        hiresLength: s.hiresLength,
        hires: await getServiceHires(i, s.hiresLength)
      })
    })
    _services.push(_service)
  }
  services = await Promise.all(_services)
  renderServices()
}

document
  .querySelector("#newProductBtn")
  .addEventListener("click", async (e) => {
    let newPrice = document.getElementById("newPrice").value;
    let productPrice = new BigNumber(newPrice).shiftedBy(ERC20_DECIMALS).toString();
    let productFee = new BigNumber(0.05 * newPrice).shiftedBy(ERC20_DECIMALS).toString();


      const _name = document.getElementById("newProductName").value
      const _image = document.getElementById("newImgUrl").value
     const _description=  document.getElementById("newProductDescription").value
      const _location = document.getElementById("newLocation").value
     const _serviceFee=  productFee
     const _price =  productPrice


    notification(`⌛ Adding "${_name}"...`)
    try {
      await contract.methods.writeProduct(
          _name, _image, _description, _location, _serviceFee, _price
      ).send({
        from: kit.defaultAccount
      }).then(() => {
        notification(`🎉 You successfully added "${_name}".`)
        getProducts()
      }).catch((err) => {
        notification(`⚠️ ${err}.`)
      })
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  })

document
  .querySelector("#newServiceBtn")
  .addEventListener("click", async (e) => {
    const serviceParams = [
      document.getElementById("newServiceName").value,
      document.getElementById("newServiceImgUrl").value,
      document.getElementById("newServiceDescription").value,
      document.getElementById("newServiceLocation").value,
      document.getElementById("newServiceContact").value,
      new BigNumber(document.getElementById("newServiceRate").value).shiftedBy(ERC20_DECIMALS).toString()
    ]

    serviceNotification(`⌛ Adding "${serviceParams[0]}"...`)
    console.log(...serviceParams);
    try {
      await contract.methods.addService(...serviceParams).send({
        from: kit.defaultAccount
      }).then(() => {
        serviceNotification(`🎉 You successfully added "${serviceParams[0]}".`)
        getServices()
      }).catch((err) => {
        serviceNotification(`⚠️ ${err}.`)
      })
    } catch (error) {
      serviceNotification(`⚠️ ${error}.`)
    }
  })

  window.addEventListener('load', async () => {
    notification("⌛ Loading...")
    await connectCeloWallet()
    await getBalance()
    await getProducts()
    await getServices()
    notificationOff()
  });

function renderProducts() {
  document.getElementById("Grainmarketplace").innerHTML = ""
  products.forEach((_product) => {
    const newDiv = document.createElement("div")
    newDiv.className = "col-md-4"
    newDiv.innerHTML = productTemplate(_product)
    document.getElementById("Grainmarketplace").appendChild(newDiv)
  })
}
function renderServices() {
  document.getElementById("GrainServices").innerHTML = ""
  services.forEach((_service) => {
    const newDiv = document.createElement("div")
    newDiv.className = "col-md-4"
    newDiv.innerHTML = serviceTemplate(_service)
    document.getElementById("GrainServices").appendChild(newDiv)
  })
}
async function renderServiceHires(index, hires) {
  let hireID = await "service" + index + "Hires";

  if(hires) {
    document.getElementById(hireID).innerHTML = "";
    hires.forEach((_hire) => {
      const newUl = document.createElement("ul")
      newUl.innerHTML = hireTemplate(_hire)
      document.getElementById(hireID).appendChild(newUl)
    })
  } else {
    document.getElementById(hireID).innerHTML = "<p class='text-center'>No Service Hire</p>";
  }
}

function hireTemplate(_hire) {
  return `
    <li>${_hire.hirer} - ${_hire.timestamp}</li>
  `
}

function productTemplate(_product) {
  return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_product.image}" alt="...">
      <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
        ${_product.sold} Sold
      </div>
      <div class="card-body text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_product.owner)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_product.name}</h2>
        <p class="card-text mb-4" style="min-height: 82px">
          ${_product.description}             
        </p>
        <p class="card-text mt-4">
          <i class="bi bi-geo-alt-fill"></i>
          <span>${_product.location}</span>
        </p>
        <div class="d-grid gap-2">
          <a class="btn btn-lg btn-outline-dark buyBtn fs-6 p-3" id=${
            _product.index
          }>
            Buy for ${_product.price.shiftedBy(-ERC20_DECIMALS).toFixed(2)}(${_product.fee.shiftedBy(-ERC20_DECIMALS).toFixed(2)}) cUSD
          </a>
        </div>
      </div>
    </div>
  `
}
function serviceTemplate(_service) {
  renderServiceHires(_service.index, _service.hires)

  return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_service.image}" alt="...">
      <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
        <button type="button" class="btn btn-link" data-bs-toggle="modal" data-bs-target="#service${_service.index}Modal" style="text-decoration: none;">
          ${_service.hiresLength} Hires
        </button>
      </div>
      <div class="card-body text-dark text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
          ${identiconTemplate(_service.user)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_service.name}</h2>
        <p class="card-text mb-1">
          ${_service.contact}             
        </p>
        <p class="card-text mb-4" style="min-height: 82px">
          ${_service.description}             
        </p>
        <p class="card-text mt-4">
          <i class="bi bi-geo-alt-fill"></i>
          <span>${_service.location}</span>
        </p>
        <div class="d-grid gap-2">
        <a class="btn btn-lg btn-outline-dark hireBtn fs-6 p-3" id=${
          _service.index
        }>
          Hire for ${_service.rate.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
        </a>
      </div>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal fade" id="service${_service.index}Modal" tabindex="-1" aria-labelledby="service${_service.index}ModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content text-dark">
          <div class="modal-header">
            <h5 class="modal-title" id="service${_service.index}ModalLabel">${_service.name} Hires</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="service${_service.index}Hires"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `
}


function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `
}

function notification(_text) {
  document.querySelector(".alert-product").style.display = "block"
  document.querySelector("#notification").textContent = _text
}

function notificationOff() {
  document.querySelector(".alert-product").style.display = "none"
}

function serviceNotification(_text) {
  document.querySelector(".alert-service").style.display = "block"
  document.querySelector("#serviceNotification").textContent = _text
}

function serviceNotificationOff() {
  document.querySelector(".alert-service").style.display = "none"
}

document.querySelector("#Grainmarketplace").addEventListener("click", async (e) => {
  if(e.target.className.includes("buyBtn")) {
    const index = e.target.id;
    notification("⌛ Waiting for payment approval...");
    try {
      let bigSum = BigInt(products[index].price) + BigInt(products[index].fee);
      const productAmountSum = bigSum.toString();
      await paymentApproval(productAmountSum);
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`⌛ Awaiting payment for "${products[index].name}"...`)
    try {
      await contract.methods.buyProduct(index).send({
        from: kit.defaultAccount
      })
      notification(`🎉 You successfully bought "${products[index].name}".`)
      getBalance()
      getProducts()
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  }
})

// trigger when the hire button is clicked
document.querySelector("#GrainServices").addEventListener("click", async (e) => {
  if(e.target.className.includes("hireBtn")) {
    const index = e.target.id;
    let servicePrice = BigInt(services[index].rate).toString();

    serviceNotification("⌛ Waiting for payment approval...");
    try {
      await paymentApproval(servicePrice);
    } catch (error) {
      serviceNotification(`⚠️ ${error}.`)
    }
    serviceNotification(`⌛ Awaiting payment to hire "${services[index].name}"...`)
    try {
      await contract.methods.hireService(index, servicePrice, services[index].user).send({
        from: kit.defaultAccount
      })
      serviceNotification(`🎉 You successfully hired "${services[index].name}".`)
      getBalance()
      getServices()
    } catch (error) {
      serviceNotification(`⚠️ ${error}.`)
    }
  }
})



