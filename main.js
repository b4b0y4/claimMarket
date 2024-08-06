import { ethers } from "./ethers.min.js"
import { networkConfigs, contractAddress, abi } from "./constants.js"

// DOM Elements
const chain = document.querySelector("#chain")
const connectBtn = document.querySelector("#connectBtn")
const walletList = document.querySelector("#walletList")
const walletBox = document.querySelector("#wallets")
const whatsBtn = document.querySelector("#whats")
const disconnectBtn = document.querySelector("#disconnect")
const overlay = document.querySelector("#overlay")
const squaresBox = document.querySelector("#squaresBox")
const explanation = document.querySelector(".explanation")
const market = document.querySelector("#market")
const mySVGs = document.querySelector("#mySVGs")
const footer = document.querySelector("footer")
const filtersBtns = document.querySelectorAll(".filters-btn")
const filterLists = document.querySelectorAll(".filter-list")
const mySVGBtns = document.querySelectorAll(".my-svg-btn")
const searchInputs = document.querySelectorAll(".search-input")

const providers = []
const sepoliaProvider = new ethers.JsonRpcProvider(
  networkConfigs.sepolia.rpcUrl
)

const TARGET_NETWORK = networkConfigs.sepolia

// Helper functions
const toggleDisplay = (element, show) => {
  element.style.display = show ? "block" : "none"
}

function createButton(config, onClick) {
  const button = document.createElement("button")
  button.innerHTML = `
      <img src="${config.icon}">
      ${config.name}
      <span class="green-dot" style="display: none"></span>
    `
  button.onclick = onClick
  return button
}

/***************************************************
 *                 CONNECTIVITY
 ***************************************************/
async function connectWallet(name) {
  const selectedProvider = providers.find((p) => p.info.name === name)
  if (!selectedProvider) return

  try {
    const accounts = await selectedProvider.provider.request({
      method: "eth_requestAccounts",
    })
    const chainId = await selectedProvider.provider.request({
      method: "eth_chainId",
    })

    localStorage.setItem("lastWallet", name)
    localStorage.setItem("connected", "true")

    switchNetwork()
    shortAddress(accounts[0])
    providerEvent(selectedProvider)
    renderWallets()
    updateNetworkStatus(chainId)

    connectBtn.classList.add("connected")

    console.log(`Connected to ${name} with account: ${accounts[0]}`)
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
      connectWallet(provider.info.name)
    })
    const greenDot = button.querySelector(".green-dot")
    greenDot.style.display =
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
    if (!ensName) return

    const ensAvatar = await mainnetProvider.getAvatar(ensName)

    connectBtn.innerHTML = ensAvatar
      ? `<img src="${ensAvatar}" style="border-radius: 50%">${ensName}`
      : ensName
  } catch (error) {
    console.log("Error getting ENS name:", error)
  }
}

function togglewalletList() {
  walletList.classList.toggle("show")
  filterLists.forEach((list) => list.classList.remove("show"))

  const connected = localStorage.getItem("connected")

  toggleDisplay(whatsBtn, connected ? false : true)
  toggleDisplay(disconnectBtn, connected ? true : false)
}

let networkWarning = false

function updateNetworkStatus(currentChainId) {
  chain.innerHTML = ""
  if (currentChainId === undefined) return

  const button = createButton(TARGET_NETWORK, () => {
    togglewalletList()
    switchNetwork()
  })
  button.id = TARGET_NETWORK.name

  const greenDot = button.querySelector(".green-dot")
  const isCorrectNetwork = currentChainId === TARGET_NETWORK.chainIdHex
  greenDot.style.display = isCorrectNetwork ? "inline-block" : "none"

  chain.appendChild(button)

  if (isCorrectNetwork) {
    toggleDisplay(overlay, false)
    showNotification("")
    networkWarning = false
    console.log("Correct network, notification cleared.")
  } else if (!networkWarning) {
    toggleDisplay(overlay, true)
    showNotification(`Switch to ${TARGET_NETWORK.name}!`, "warning", true)
    networkWarning = true
    console.log("Incorrect network, showing notification.")
  }
}

async function switchNetwork() {
  const selectedProvider = providers.find(
    (provider) => provider.info.name === localStorage.getItem("lastWallet")
  )
  try {
    await selectedProvider.provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: TARGET_NETWORK.chainIdHex }],
    })
    updateNetworkStatus(TARGET_NETWORK.chainIdHex)
  } catch (error) {
    console.error("Error switching network:", error)
  }
}

async function disconnect() {
  const lastWallet = localStorage.getItem("lastWallet")
  const selectedProvider = providers.find((p) => p.info.name === lastWallet)

  try {
    await selectedProvider?.provider.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    })
  } catch (error) {
    console.error("Error disconnecting:", error)
  }

  localStorage.clear()
  connectBtn.innerHTML = "Connect"
  ;[walletList, connectBtn].forEach((el) =>
    el.classList.remove("show", "connected")
  )
  toggleDisplay(overlay, false)
  renderWallets()
  updateNetworkStatus()
}

function showNotification(message, type = "info", isPermanent = false) {
  const notificationBox = document.querySelector("#notificationBox")

  document.querySelectorAll("#notification").forEach((notification) => {
    notification.classList.remove("show")
    setTimeout(() => notificationBox.removeChild(notification), 500)
  })

  if (!message) return

  const notification = document.createElement("div")
  notification.id = "notification"
  notification.classList.add(type)
  notification.innerHTML = `<div class="notif-content">${message}</div>`

  notificationBox.prepend(notification)
  notification.offsetHeight
  notification.classList.add("show")

  if (!isPermanent) {
    setTimeout(() => {
      notification.classList.remove("show")
      setTimeout(() => {
        notificationBox.removeChild(notification)
      }, 500)
    }, 5000)
  }
  return notification
}

function providerEvent(provider) {
  provider.provider
    .on("accountsChanged", (accounts) =>
      accounts.length > 0 ? shortAddress(accounts[0]) : disconnect()
    )
    .on("chainChanged", (chainId) => {
      console.log(`Chain changed to ${chainId} for ${provider.info.name}`)
      updateNetworkStatus(chainId)
    })
    .on("disconnect", () => {
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
}

function toggleDarkMode() {
  const isDarkMode = themeToggle.checked
  setDarkMode(isDarkMode)
  localStorage.setItem("darkMode", JSON.stringify(isDarkMode))
}

function getTheme() {
  const savedDarkMode =
    JSON.parse(localStorage.getItem("darkMode")) ||
    window.matchMedia("(prefers-color-scheme: dark)").matches

  setDarkMode(savedDarkMode)
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

function createSquareWithButton(color, id, isClaimed, allClaimed) {
  const container = document.createElement("div")
  container.classList.add("square-container")

  const svgNamespace = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(svgNamespace, "svg")
  svg.setAttribute("width", "100%")
  svg.setAttribute("height", "100%")
  svg.setAttribute("viewBox", "0 0 100 100")
  svg.setAttribute("preserveAspectRatio", "none")
  svg.setAttribute("xmlns", svgNamespace)
  svg.setAttribute("id", `svg-${id}`)

  const rect = document.createElementNS(svgNamespace, "rect")
  rect.setAttribute("width", "100%")
  rect.setAttribute("height", "100%")
  rect.setAttribute("fill", color)
  svg.appendChild(rect)

  const button = document.createElement("button")
  button.textContent = isClaimed ? `Claimed!` : `Claim #${id}`
  button.classList.add("claim-button")
  button.disabled = isClaimed

  if (allClaimed) {
    button.textContent = `SVG #${id}`
    button.disabled = true
    button.style.opacity = "0.6"
    button.style.backgroundColor = "transparent"
    button.style.color = "rgb(30, 30, 30)"
    button.style.display = "flex"
    button.style.justifyContent = "flex-end"
    button.style.height = "20px"
  } else if (isClaimed) {
    button.style.opacity = "0.3"
    svg.style.filter = "brightness(0.6)"
    button.style.backgroundColor = "transparent"
    button.style.color = "rgb(250, 250, 250)"
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

          showNotification("Claim in progress...", "info", true)

          const transactionResponse = await contract.mint(id)

          await listenForTransactionMine(transactionResponse, provider)

          button.textContent = `Claimed!`
          button.style.opacity = "0.3"
          svg.style.filter = "brightness(0.6)"
          button.style.backgroundColor = "transparent"
          button.style.color = "rgb(250, 250, 250)"
          button.disabled = true

          showNotification("")
          showNotification("Successfully claimed!", "success")
          showMySVGs()
        } catch (error) {
          console.error("Claim failed:", error)
          showNotification("")
          showNotification("Claim failed :(", "warning")
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
  const allClaimed = unmintedIds.length === 0

  colors.forEach((color, index) => {
    const colorId = index + 1
    const isClaimed = allClaimed || !unmintedIdsSet.has(colorId)
    const squareWithButton = createSquareWithButton(
      color,
      colorId,
      isClaimed,
      allClaimed
    )
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
        { text: "Offer", className: "offer-btn" },
        { text: "Cancel", className: "cancel-offer-btn" },
        { text: "Buy", className: "buy-btn" },
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
  svg.setAttribute("width", "100%")
  svg.setAttribute("height", "auto")
  svg.setAttribute("viewBox", "0 0 100 100")
  svg.setAttribute("preserveAspectRatio", "none")
  svg.setAttribute("xmlns", svgNamespace)
  svg.setAttribute("id", `svg-${tokenId}`)

  const rect = document.createElementNS(svgNamespace, "rect")
  rect.setAttribute("width", "100%")
  rect.setAttribute("height", "100%")
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
  const priceInfoElement = document.querySelectorId(`price-info-${tokenId}`)
  if (priceInfoElement) {
    priceInfoElement.textContent = info
  }
}

function updateBidInfo(tokenId, info) {
  const bidInfoElement = document.querySelectorId(`bid-info-${tokenId}`)
  if (bidInfoElement) {
    bidInfoElement.textContent = info
  }
}

/***************************************************
 *                  DISPLAY MY SVG
 **************************************************/
function toggleMySVGs() {
  const isVisible = mySVGs.classList.toggle("open")

  localStorage.setItem("mySVGsVisible", isVisible)

  if (squaresBox) squaresBox.classList.toggle("mySVGs-open")
  if (market) market.classList.toggle("mySVGs-open")
  explanation.classList.toggle("mySVGs-open")
  footer.classList.toggle("mySVGs-open")

  mySVGBtns.forEach((btn) => (btn.innerHTML = "My SVGs"))

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
      mySVGBtns.forEach((btn) => {
        btn.innerHTML = `${balance} SVG${balance > 1 ? "s" : ""}`
      })

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
    bidText: "Offer 0.05 WETH",
    buttons: [
      { text: "List", className: "list-btn" },
      { text: "Cancel", className: "cancel-list-btn" },
      { text: "Accept", className: "accept-offer-btn" },
    ],
  })
  mySVGs.appendChild(card)
}

function showTokenById(tokenIdInput) {
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
        { text: "Offer", className: "offer-btn" },
        { text: "Cancel", className: "cancel-offer-btn" },
        { text: "Buy", className: "buy-btn" },
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
    connectWallet(localStorage.getItem("lastWallet"))

  console.log(`Discovered provider: ${providerDetail.info.name}`)
})

window.addEventListener("load", () => {
  const currentPage = document.body.id
  const selectedProvider = providers.find(
    (provider) => provider.info.name === localStorage.getItem("lastWallet")
  )
  if (selectedProvider) {
    providerEvent(selectedProvider)
    updateNetworkStatus(TARGET_NETWORK.chainIdHex)
  }

  getTheme()
  root.classList.remove("no-flash")

  const isVisible = localStorage.getItem("mySVGsVisible") === "true"
  if (currentPage === "index-page") {
    renderSVGsClaim(rainbowColors)
    if (isVisible) {
      mySVGs.classList.add("open")
      squaresBox.classList.add("mySVGs-open")
      explanation.classList.add("mySVGs-open")
      footer.classList.add("mySVGs-open")
      showMySVGs()
    }
  } else if (currentPage === "market-page") {
    displayAllSVGs()
    if (isVisible) {
      mySVGs.classList.add("open")
      market.classList.add("mySVGs-open")
      explanation.classList.add("mySVGs-open")
      footer.classList.add("mySVGs-open")
      showMySVGs()
    }
  }
})

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (event) => {
    const savedDarkMode = JSON.parse(localStorage.getItem("darkMode"))
    if (savedDarkMode === null) {
      setDarkMode(event.matches)
    }
  })

connectBtn.addEventListener("click", (event) => {
  event.stopPropagation()
  togglewalletList()
})

filtersBtns.forEach((btn, index) => {
  btn.addEventListener("click", (event) => {
    event.stopPropagation()
    filterLists[index].classList.toggle("show")
    walletList.classList.remove("show")
  })
})

document.addEventListener("click", () => {
  walletList.classList.remove("show")
  filterLists.forEach((list) => list.classList.remove("show"))
})

walletList.addEventListener("click", (event) => event.stopPropagation())

filterLists.forEach((btn) => {
  btn.addEventListener("click", (event) => event.stopPropagation())
})

themeToggle.addEventListener("change", toggleDarkMode)

disconnectBtn.addEventListener("click", disconnect)

mySVGBtns.forEach((btn) => {
  btn.addEventListener("click", toggleMySVGs)
})

searchInputs.forEach((input) => {
  input.addEventListener("input", (event) => {
    const tokenIdInput = event.target.value.trim()
    showTokenById(tokenIdInput)
  })
})

window.dispatchEvent(new Event("eip6963:requestProvider"))
