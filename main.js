import { ethers } from "./ethers.min.js"
import { networkConfigs, contractAddress, abi } from "./constants.js"

// DOM Elements
const networkBtn = document.getElementById("networkBtn")
const connectBtn = document.getElementById("connectBtn")
const walletList = document.getElementById("walletList")
const walletBox = document.getElementById("wallets")
const whatsBtn = document.getElementById("whats")
const disconnectBtn = document.getElementById("disconnect")
const overlay = document.getElementById("overlay")
const networkIcon = document.getElementById("networkIcon")
const notification = document.getElementById("notification")
const squaresBox = document.getElementById("squaresBox")
const market = document.getElementById("market")
const filtersBtn = document.getElementById("filtersBtn")
const filterList = document.getElementById("filterList")
const mySVGBtn = document.getElementById("mySVGBtn")
const mySVGs = document.getElementById("mySVGs")

const providers = []
const sepoliaProvider = new ethers.JsonRpcProvider(
  networkConfigs.sepolia.rpcUrl
)

/***************************************************
 *                CONNECTIVITY
 **************************************************/

// Helper functions
const toggleDisplay = (element, show) => {
  element.style.display = show ? "block" : "none"
}

const createButton = (config, onClick) => {
  const button = document.createElement("button")
  const img = document.createElement("img")
  img.src = config.icon
  button.appendChild(img)
  button.appendChild(document.createTextNode(config.name))

  const indicator = document.createElement("span")
  indicator.className = "indicator"
  indicator.style.display = "none"
  button.appendChild(indicator)

  button.onclick = onClick
  return button
}

async function selectWallet(name) {
  const selectedProvider = providers.find((p) => p.info.name === name)
  if (!selectedProvider) return

  try {
    const accounts = await selectedProvider.provider.request({
      method: "eth_requestAccounts",
    })
    const chainId = await selectedProvider.provider.request({
      method: "eth_chainId",
    })

    localStorage.setItem("currentChainId", chainId)
    localStorage.setItem("lastWallet", selectedProvider.info.name)
    localStorage.setItem("connected", "true")

    switchNetwork(networkConfigs.sepolia)
    shortAddress(accounts[0])
    providerEvent(selectedProvider)
    updateNetworkButton(chainId)
    updateSettings()
    renderWallets()

    connectBtn.classList.add("connected")

    console.log(
      `Connected to ${selectedProvider.info.name} with account: ${accounts[0]}`
    )
  } catch (error) {
    console.error("Failed to connect:", error)
  }
}

function renderWallets() {
  walletBox.innerHTML = ""
  const connectedWallet = localStorage.getItem("lastWallet")

  providers.forEach((provider) => {
    const button = createButton(provider.info, () => {
      togglewalletList()
      selectWallet(provider.info.name)
    })
    const indicator = button.querySelector(".indicator")
    indicator.style.display =
      provider.info.name === connectedWallet ? "inline-block" : "none"

    walletBox.appendChild(button)
  })
}

function shortAddress(address) {
  connectBtn.innerHTML = `${address.substring(0, 5)}...${address.substring(
    address.length - 4
  )}`
  getEns(address)
}

async function getEns(address) {
  try {
    const mainnetProvider = new ethers.JsonRpcProvider(
      networkConfigs.ethereum.rpcUrl
    )
    const ensName = await mainnetProvider.lookupAddress(address)
    const ensAvatar = await mainnetProvider.getAvatar(ensName)

    if (ensName && ensAvatar) {
      connectBtn.innerHTML = ""
      const img = document.createElement("img")
      img.src = ensAvatar
      img.style.borderRadius = "50%"

      connectBtn.appendChild(img)
      connectBtn.appendChild(document.createTextNode(ensName))
    } else if (ensName) {
      connectBtn.innerHTML = ensName
    }
  } catch (error) {
    console.log("Error getting ENS name:", error)
  }
}

function togglewalletList() {
  walletList.classList.toggle("show")
  filterList.classList.remove("show")

  const connected = localStorage.getItem("connected")

  toggleDisplay(whatsBtn, connected ? false : true)
  toggleDisplay(disconnectBtn, connected ? true : false)
}

function updateSettings() {
  const hasProvider = providers.length > 0
  document.getElementById("settings").classList.toggle("nowallet", !hasProvider)
}

async function switchNetwork(newNetwork) {
  const selectedProvider = providers.find(
    (provider) => provider.info.name === localStorage.getItem("lastWallet")
  )
  try {
    await selectedProvider.provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: newNetwork.chainIdHex }],
    })
    localStorage.setItem("currentChainId", newNetwork.chainIdHex)

    updateNetworkButton(newNetwork.chainIdHex)
  } catch (error) {
    console.error("Error switching network:", error)
  }
}

function updateNetworkButton(chainId) {
  const network = Object.values(networkConfigs).find(
    (net) => net.chainId === parseInt(chainId) || net.chainIdHex === chainId
  )
  if (network && network.showInUI) {
    networkIcon.src = network.icon
    toggleDisplay(overlay, false)
    localStorage.setItem("currentChainId", chainId)
    showNotification("")
  } else {
    networkIcon.src = "./logo/warning.svg"
    toggleDisplay(overlay, true)
    localStorage.removeItem("currentChainId")
    showNotification("Switch to Sepolia!", "warning")
  }
}

async function disconnect() {
  const selectedProvider = providers.find(
    (provider) => provider.info.name === localStorage.getItem("lastWallet")
  )

  try {
    await selectedProvider.provider.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    })
  } catch (error) {
    console.error("Error disconnecting:", error)
  }
  ;[
    "connected",
    "currentChainId",
    "lastWallet",
    "mySVGsVisible",
    "-walletlink:https://www.walletlink.org:DefaultJsonRpcUrl",
    "-walletlink:https://www.walletlink.org:session:secret",
    "-walletlink:https://www.walletlink.org:Addresses",
    "-walletlink:https://www.walletlink.org:IsStandaloneSigning",
    "-walletlink:https://www.walletlink.org:session:linked",
    "-walletlink:https://www.walletlink.org:session:id",
    "-walletlink:https://www.walletlink.org:DefaultChainId",
    "-walletlink:https://www.walletlink.org:EIP6963ProviderUUID",
  ].forEach((item) => localStorage.removeItem(item))

  connectBtn.innerHTML = "Connect Wallet"
  ;[(walletList, connectBtn)].forEach((el) => {
    el.classList.remove("show", "rotate", "connected")
  })

  toggleDisplay(overlay, false)
  toggleDisplay(walletBox, true)
  updateSettings()
  renderWallets()

  location.reload()
}

function showNotification(message, type = "info") {
  const content = document.querySelector(".notif-content")
  if (message) {
    content.textContent = message
    notification.classList.add("show", type)
  } else {
    notification.classList.remove("show")
    setTimeout(() => {
      notification.classList.remove("info", "warning")
      content.textContent = ""
    }, 500)
  }
}

function providerEvent(provider) {
  provider.provider.on("accountsChanged", async function (accounts) {
    if (accounts.length > 0) {
      shortAddress(accounts[0])
    } else {
      disconnect()
    }
  })
  provider.provider.on("chainChanged", (chainId) => {
    console.log(`Chain changed to ${chainId} for ${provider.info.name}`)
    updateNetworkButton(chainId)
  })
  provider.provider.on("disconnect", () => {
    console.log(`Disconnected from ${provider.info.name}`)
    disconnect()
  })
}

/***************************************************
 *              DARK/LIGHT MODE TOGGLE
 **************************************************/
const root = document.documentElement
const themeToggle = document.querySelector(".theme input")
const themeLabel = document.querySelector(".theme")

function setDarkMode(isDarkMode) {
  root.classList.toggle("dark-mode", isDarkMode)
  themeToggle.checked = isDarkMode
  themeLabel.classList.toggle("dark", isDarkMode)
  localStorage.setItem("darkMode", JSON.stringify(isDarkMode))
}

function toggleDarkMode() {
  const isDarkMode = themeToggle.checked
  setDarkMode(isDarkMode)
}

/***************************************************
 *                   CLAIM UI
 **************************************************/
async function getUnmintedColorIds() {
  try {
    const contract = new ethers.Contract(contractAddress, abi, sepoliaProvider)

    const unmintedIds = await contract.getUnmintedColorIds()

    return unmintedIds.map((id) => Number(id))
  } catch (error) {
    console.error("Failed to fetch unminted color IDs:", error)
    return []
  }
}

function createSquareWithButton(color, id, isClaimed) {
  const container = document.createElement("div")
  container.classList.add("square-container")

  const svgNamespace = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(svgNamespace, "svg")
  svg.setAttribute("width", "100")
  svg.setAttribute("height", "100")
  svg.setAttribute("xmlns", svgNamespace)
  svg.setAttribute("id", `svg-${id}`)

  const rect = document.createElementNS(svgNamespace, "rect")
  rect.setAttribute("width", "100")
  rect.setAttribute("height", "100")
  rect.setAttribute("fill", color)

  svg.appendChild(rect)

  const button = document.createElement("button")
  button.textContent = isClaimed ? `Claimed` : `Claim #${id}`
  button.classList.add("claim-button")
  button.disabled = isClaimed

  if (isClaimed) {
    button.style.opacity = "0.3"
    svg.style.filter = "brightness(0.6)"
  } else {
    button.addEventListener("click", async function () {
      const selectedProvider = providers.find(
        (provider) => provider.info.name === localStorage.getItem("lastWallet")
      )
      if (selectedProvider) {
        try {
          await selectedProvider.provider.request({
            method: "eth_requestAccounts",
          })

          const provider = new ethers.BrowserProvider(selectedProvider.provider)

          const signer = await provider.getSigner()

          const contract = new ethers.Contract(contractAddress, abi, signer)

          showNotification("Claim in progress...")

          const transactionResponse = await contract.mint(id)

          await listenForTransactionMine(transactionResponse, provider)

          button.textContent = `Claimed!`
          button.style.opacity = "0.9"
          button.disabled = true
          svg.style.filter = "brightness(0.5)"

          showNotification("Successfully claimed!")
          setTimeout(() => {
            showNotification("")
            showMySVGs()
          }, 3000)
        } catch (error) {
          console.error("Claim failed:", error)
          showNotification("Claim failed.", "warning")
          setTimeout(() => {
            showNotification("")
          }, 3000)
        }
      } else {
        console.error("No provider selected or available.")
      }
    })
  }

  container.appendChild(svg)
  container.appendChild(button)

  return container
}

function listenForTransactionMine(transactionResponse, provider) {
  console.log(`Mining ${transactionResponse.hash}`)
  return new Promise((resolve, reject) => {
    provider.once(transactionResponse.hash, (transactionReceipt) => {
      console.log(
        `Completed with ${transactionReceipt.confirmations} confirmations.`
      )
      resolve()
    })
  })
}

async function renderSVGsClaim(colors) {
  const unmintedIds = await getUnmintedColorIds()
  const unmintedIdsSet = new Set(unmintedIds)

  colors.forEach((color, index) => {
    const colorId = index + 1
    const isClaimed = !unmintedIdsSet.has(colorId)
    const squareWithButton = createSquareWithButton(color, colorId, isClaimed)
    squaresBox.appendChild(squareWithButton)
  })
}

function generateRainbowColors(numColors) {
  const colors = []

  for (let i = 1; i <= numColors; i++) {
    const hue = Math.floor((i - 1) * (360 / numColors))
    const color = `hsl(${hue}, 100%, 50%)`
    colors.push(color)
  }

  return colors
}

const rainbowColors = generateRainbowColors(250)

/***************************************************
 *                   MARKET UI
 **************************************************/
function displayAllSVGs() {
  rainbowColors.forEach((color, index) => {
    const tokenId = index + 1
    const card = createSVGCard(tokenId, color, {
      buttons: [
        { text: "Buy", className: "buy-btn" },
        { text: "Cancel", className: "cancel-offer-btn" },
        { text: "Offer", className: "offer-btn" },
      ],
    })
    market.appendChild(card)
  })
}

function createSVGCard(tokenId, color, options = {}) {
  const {
    container = document.createElement("div"),
    priceText = "",
    bidText = "",
    buttons = [],
    dynamicInfoLabel = null,
  } = options

  container.classList.add("svg-card")

  const svgNamespace = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(svgNamespace, "svg")
  svg.setAttribute("width", "100")
  svg.setAttribute("height", "100")
  svg.setAttribute("xmlns", svgNamespace)
  svg.setAttribute("id", `svg-${tokenId}`)

  const rect = document.createElementNS(svgNamespace, "rect")
  rect.setAttribute("width", "100")
  rect.setAttribute("height", "100")
  rect.setAttribute("fill", color)
  svg.appendChild(rect)

  const label = document.createElement("p")
  label.textContent = `SVG #${tokenId}`
  label.classList.add("svg-label")

  const priceInfo = document.createElement("p")
  priceInfo.classList.add("price-info")
  priceInfo.id = `price-info-${tokenId}`
  priceInfo.textContent = priceText

  const bidInfo = document.createElement("p")
  bidInfo.classList.add("bid-info")
  bidInfo.id = `bid-info-${tokenId}`
  bidInfo.textContent = bidText

  const buttonContainer = document.createElement("div")
  buttonContainer.classList.add("button-container")

  buttons.forEach(({ text, className }) => {
    const button = document.createElement("button")
    button.textContent = text
    button.classList.add(className)
    buttonContainer.appendChild(button)
  })

  container.append(svg, label, priceInfo, bidInfo, buttonContainer)

  if (dynamicInfoLabel) {
    const dynamicInfo = document.createElement("p")
    dynamicInfo.classList.add("dynamic-info")
    dynamicInfo.id = `dynamic-info-${tokenId}`
    container.appendChild(dynamicInfo)
  }

  return container
}

function updatePriceInfo(tokenId, info) {
  const priceInfoElement = document.getElementById(`price-info-${tokenId}`)
  if (priceInfoElement) {
    priceInfoElement.textContent = info
  }
}

function updateBidInfo(tokenId, info) {
  const bidInfoElement = document.getElementById(`bid-info-${tokenId}`)
  if (bidInfoElement) {
    bidInfoElement.textContent = info
  }
}

/***************************************************
 *                  DISPLAY MY SVG
 **************************************************/
function toggleMySVGs() {
  const isVisible = mySVGs.classList.toggle("show")
  localStorage.setItem("mySVGsVisible", isVisible)
  if (squaresBox) squaresBox.classList.toggle("mySVGs-open")
  if (market) market.classList.toggle("mySVGs-open")
  walletList.classList.remove("show")

  mySVGBtn.innerHTML = "My SVGs"

  if (isVisible) {
    showMySVGs()
  }
}

async function showMySVGs() {
  const selectedProvider = providers.find(
    (provider) => provider.info.name === localStorage.getItem("lastWallet")
  )

  if (selectedProvider) {
    try {
      const accounts = await selectedProvider.provider.request({
        method: "eth_requestAccounts",
      })

      const contract = new ethers.Contract(
        contractAddress,
        abi,
        sepoliaProvider
      )
      const balance = await contract.balanceOf(accounts[0])

      mySVGs.innerHTML = ""
      mySVGBtn.innerHTML = ""
      mySVGBtn.innerHTML = `${balance} SVG${balance > 1 ? "s" : ""}`

      if (balance.toString() === "0") {
        mySVGs.textContent = "You don't own any Rainbow SVGs yet."
        return
      }

      const ownedTokenIds = await getSVGOwned(contract, accounts[0], balance)

      for (const tokenId of ownedTokenIds) {
        displaySVG(tokenId)
      }
    } catch (error) {
      console.error("Error fetching SVGs:", error)
      mySVGs.textContent = "Error fetching your SVGs"
    }
  } else {
    mySVGs.textContent = "Please connect your wallet first"
  }
}

async function getSVGOwned(contract, address) {
  const MAX_SUPPLY = 250
  const ownedTokenIds = []
  const promises = []

  for (let i = 1; i <= MAX_SUPPLY; i++) {
    promises.push(
      contract
        .ownerOf(i)
        .then((owner) => {
          if (owner.toLowerCase() === address.toLowerCase()) {
            ownedTokenIds.push(i)
          }
        })
        .catch(() => {})
    )
  }
  await Promise.all(promises)
  return ownedTokenIds
}

function displaySVG(tokenId) {
  const color = rainbowColors[tokenId - 1]
  const card = createSVGCard(tokenId, color, {
    priceText: "0.1 ETH",
    bidText: "Offer 0.05 ETH",
    buttons: [
      { text: "List", className: "list-btn" },
      { text: "Cancel", className: "cancel-list-btn" },
      { text: "Accept", className: "accept-offer-btn" },
    ],
  })
  mySVGs.appendChild(card)
}

function showTokenById() {
  const tokenIdInput = document.getElementById("searchInput").value.trim()

  if (tokenIdInput === "") {
    if (squaresBox) {
      squaresBox.innerHTML = ""
      renderSVGsClaim(rainbowColors)
    }
    if (market) {
      market.innerHTML = ""
      displayAllSVGs()
    }
    return
  }

  const tokenIds = tokenIdInput.split(",").map((id) => id.trim())
  const validTokenIds = tokenIds
    .filter((id) => {
      const num = Number(id)
      if (isNaN(num) || num < 1 || num > rainbowColors.length) {
        console.error(`Invalid Token ID: ${id}`)
        return false
      }
      return true
    })
    .map(Number)

  if (validTokenIds.length === 0) {
    console.error("No valid Token IDs provided")
    return
  }

  if (squaresBox) squaresBox.innerHTML = ""
  if (market) market.innerHTML = ""

  validTokenIds.forEach((tokenId) => {
    const color = rainbowColors[tokenId - 1]
    const card = createSVGCard(tokenId, color, {
      buttons: [
        { text: "Buy", className: "buy-btn" },
        { text: "Cancel", className: "cancel-offer-btn" },
        { text: "Offer", className: "offer-btn" },
      ],
    })

    if (squaresBox) squaresBox.appendChild(card)
    if (market) market.appendChild(card)
  })
}

/***************************************************
 *         EVENTS AND INITIALIZATION FUNCTIONS
 **************************************************/
window.addEventListener("eip6963:announceProvider", (event) => {
  const providerDetail = event.detail
  providers.push(providerDetail)
  renderWallets()

  if (localStorage.getItem("connected"))
    selectWallet(localStorage.getItem("lastWallet"))

  console.log(`Discovered provider: ${providerDetail.info.name}`)
})

function getCurrentPage() {
  return document.body.id
}

function initializeIndexPage() {
  renderSVGsClaim(rainbowColors)
}

function initializeMarketPage() {
  displayAllSVGs()
}

function initializePage() {
  const currentPage = getCurrentPage()

  const storedChainId = localStorage.getItem("currentChainId")
  if (storedChainId) updateNetworkButton(storedChainId)
  updateSettings()

  const selectedProvider = providers.find(
    (provider) => provider.info.name === localStorage.getItem("lastWallet")
  )
  if (selectedProvider) providerEvent(selectedProvider)

  const savedDarkMode = JSON.parse(localStorage.getItem("darkMode"))
  setDarkMode(savedDarkMode === true)
  root.classList.remove("no-flash")

  const isVisible = localStorage.getItem("mySVGsVisible") === "true"
  if (currentPage === "index-page") {
    initializeIndexPage()
    if (isVisible) {
      mySVGs.classList.add("show")
      squaresBox.classList.add("mySVGs-open")
      showMySVGs()
    }
  } else if (currentPage === "market-page") {
    initializeMarketPage()
    if (isVisible) {
      mySVGs.classList.add("show")
      market.classList.add("mySVGs-open")
      showMySVGs()
    }
  }
}

window.addEventListener("load", initializePage)

networkBtn.addEventListener("click", () => {
  switchNetwork(networkConfigs.sepolia)
})

connectBtn.addEventListener("click", (event) => {
  event.stopPropagation()
  togglewalletList()
})

document.addEventListener("click", () => {
  walletList.classList.remove("show")
  filterList.classList.remove("show")
})

walletList.addEventListener("click", (event) => event.stopPropagation())

filterList.addEventListener("click", (event) => event.stopPropagation())

filtersBtn.addEventListener("click", (event) => {
  event.stopPropagation()
  filterList.classList.toggle("show")
  walletList.classList.remove("show")
})

disconnectBtn.addEventListener("click", disconnect)

themeToggle.addEventListener("change", toggleDarkMode)

mySVGBtn.addEventListener("click", toggleMySVGs)

document.getElementById("searchInput").addEventListener("input", showTokenById)

window.dispatchEvent(new Event("eip6963:requestProvider"))
