import { ethers } from "./ethers.min.js"
import {
  networkConfigs,
  svgAddress,
  svgAbi,
  marketAddress,
  marketAbi,
} from "./constants.js"

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
const showBids = document.querySelectorAll("#showBids")
const clearFil = document.querySelectorAll("#clearFil")
const mySVGBtns = document.querySelectorAll(".my-svg-btn")
const searchBox = document.querySelectorAll(".search-box")
const searchInputs = document.querySelectorAll(".search-input")

const providers = []
const rainbowRpc = localStorage.getItem("rainbowRpc")
const sepoliaProvider = new ethers.JsonRpcProvider(rainbowRpc)

const svgContract = new ethers.Contract(svgAddress, svgAbi, sepoliaProvider)
const marketContract = new ethers.Contract(
  marketAddress,
  marketAbi,
  sepoliaProvider
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
  const isCorrectNetwork = currentChainId === TARGET_NETWORK.chainIdHex
  chain.innerHTML = ""
  const button = createButton(TARGET_NETWORK, () => {
    togglewalletList()
    switchNetwork()
  })
  button.id = TARGET_NETWORK.name
  button.querySelector(".green-dot").style.display = isCorrectNetwork
    ? "inline-block"
    : "none"
  chain.appendChild(button)

  if (currentChainId === undefined) return

  toggleDisplay(overlay, !isCorrectNetwork)

  if (!isCorrectNetwork && !networkWarning) {
    showNotification(`Switch to ${TARGET_NETWORK.name}!`, "warning", true)
    networkWarning = true
  } else if (!rainbowRpc) {
    rpcCheck()
    if (document.body.id === "market-page") refreshDisplay()
  } else if (isCorrectNetwork) {
    showNotification("")
    networkWarning = false
  }
}

async function switchNetwork() {
  const selectedProvider = providers.find(
    (p) => p.info.name === localStorage.getItem("lastWallet")
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
  const selectedProvider = providers.find(
    (p) => p.info.name === localStorage.getItem("lastWallet")
  )

  try {
    await selectedProvider?.provider.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    })
  } catch (error) {
    console.error("Error disconnecting:", error)
  }

  Object.keys(localStorage).forEach((key) => {
    if (
      key === "connected" ||
      key === "lastWallet" ||
      key === "mySVGsVisible" ||
      key === "wagmi.store" ||
      key.startsWith("-walletlink")
    ) {
      localStorage.removeItem(key)
    }
  })

  connectBtn.innerHTML = "Connect"
  ;[walletList, connectBtn].forEach((el) =>
    el.classList.remove("show", "connected")
  )
  toggleDisplay(overlay, false)
  renderWallets()
  refreshDisplay()
  rpcCheck()
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
    .on("accountsChanged", (accounts) => {
      accounts.length > 0 ? shortAddress(accounts[0]) : disconnect()
      refreshDisplay()
    })
    .on("chainChanged", (chainId) => {
      console.log(`Chain changed to ${chainId} for ${provider.info.name}`)
      updateNetworkStatus(chainId)
    })
    .on("disconnect", () => {
      console.log(`Disconnected from ${provider.info.name}`)
      disconnect()
    })
}

function rpcCheck() {
  !rainbowRpc
    ? showNotification(
        `Add a rpc Url! Click on the Connect button`,
        "warning",
        true
      )
    : showNotification("")
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
    const unmintedIds = await svgContract.getUnmintedColorIds()

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
  button.classList.add("claim-button")

  if (allClaimed) {
    button.textContent = `SVG #${id}`
    button.disabled = true
    Object.assign(button.style, {
      opacity: "0.6",
      backgroundColor: "transparent",
      color: "rgb(30, 30, 30)",
      display: "flex",
      justifyContent: "flex-end",
      height: "20px",
    })
  } else {
    button.textContent = isClaimed ? "Claimed!" : `Claim #${id}`
    button.disabled = isClaimed

    if (isClaimed) {
      Object.assign(button.style, {
        opacity: "0.3",
        backgroundColor: "transparent",
        color: "rgb(250, 250, 250)",
      })
      svg.style.filter = "brightness(0.6)"
    } else {
      button.addEventListener("click", async function () {
        const user = await getAccount()
        if (!user) return console.error("No provider selected or available.")

        try {
          const { contract: sContract } = await getSignerContract(
            svgAddress,
            svgAbi
          )
          showNotification(`Claiming SVG #${id}`, "info", true)

          const tx = await sContract.mint(id)
          await tx.wait()

          button.textContent = "Claimed!"
          button.disabled = true
          Object.assign(button.style, {
            opacity: "0.3",
            backgroundColor: "transparent",
            color: "rgb(250, 250, 250)",
          })
          svg.style.filter = "brightness(0.6)"
          showNotification(`Claimed SVG #${id}!`, "success")
          showMySVGs()
        } catch (error) {
          showNotification(error.message.split("(")[0].trim(), "warning")
          console.error(error)
        }
      })
    }
  }
  container.append(svg, button)
  return container
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
 *                  DISPLAY MY SVG
 **************************************************/
function toggleMySVGs() {
  const isVisible = mySVGs.classList.toggle("open")

  localStorage.setItem("mySVGsVisible", isVisible)

  if (squaresBox) {
    squaresBox.classList.toggle("mySVGs-open")
    explanation.classList.toggle("mySVGs-open")
  }
  if (market) market.classList.toggle("mySVGs-open")
  footer.classList.toggle("mySVGs-open")

  mySVGBtns.forEach((btn) => (btn.innerHTML = "My SVGs"))

  if (isVisible) {
    showMySVGs()
  }
}

async function showMySVGs() {
  if (!rainbowRpc) {
    rpcCheck()
    return
  }
  const user = await getAccount()

  if (user) {
    try {
      const ownedToken = await svgContract.tokensOfOwner(user)

      mySVGs.innerHTML = ""
      mySVGBtns.forEach((btn) => {
        btn.innerHTML = `${ownedToken.length} SVG${
          ownedToken.length > 1 ? "s" : ""
        }`
      })

      if (ownedToken.length === "0") {
        mySVGs.textContent = "You don't own any Rainbow SVGs yet."
        return
      }
      displaySVG(ownedToken)
    } catch (error) {
      console.error(error)
      const errorMessage = `${error.message.split("(")[0].trim()}`
      showNotification(errorMessage, "warning")
      mySVGs.textContent = "Error fetching your SVGs"
    }
  } else {
    mySVGs.textContent = "Please connect your wallet"
  }
}

async function displaySVG(tokenIds) {
  try {
    const [listedItems, allOffers] = await Promise.all([
      getAllListedItems(),
      getAllOffers(),
    ])

    const itemMap = new Map(
      tokenIds.map((id) => [
        id.toString(),
        { tokenId: id.toString(), isActive: false, price: "0" },
      ])
    )
    const offerMap = new Map(allOffers.map((offer) => [offer.tokenId, offer]))

    listedItems.forEach(
      (item) =>
        itemMap.has(item.tokenId) &&
        itemMap.set(item.tokenId, { ...item, isActive: item.isActive })
    )

    const sortedItems = Array.from(itemMap.values()).sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1

      return BigInt(a.price) !== BigInt(b.price)
        ? BigInt(a.price) < BigInt(b.price)
          ? -1
          : 1
        : BigInt(a.tokenId) < BigInt(b.tokenId)
        ? -1
        : 1
    })

    mySVGs.innerHTML = ""

    sortedItems.forEach(({ tokenId, isActive, price }) => {
      const color = rainbowColors[parseInt(tokenId) - 1]
      const offer = offerMap.get(tokenId) || {}

      const buttons = [
        { text: isActive ? "Edit" : "List", className: "list-btn" },
        ...(isActive ? [{ text: "Cancel", className: "cancel-list-btn" }] : []),
        ...(offer.amount > 0
          ? [{ text: "Accept", className: "accept-offer-btn" }]
          : []),
      ]

      const card = createSVGCard(tokenId, color, {
        priceText: isActive ? `${ethers.formatEther(price)} ETH` : "",
        bidText:
          offer.amount > 0
            ? `Offer: ${ethers.formatEther(offer.amount)} ETH`
            : "",
        buttons,
      })
      mySVGs.appendChild(card)
    })
  } catch (error) {
    console.error("Error displaying SVGs:", error)
  }
}

/***************************************************
 *                   MARKET UI
 **************************************************/
async function getAllListedItems() {
  try {
    const [tokenIds, listings] = await marketContract.getAllListedItems()
    return tokenIds.map((id, index) => ({
      tokenId: id.toString(),
      seller: listings[index].seller,
      price: listings[index].price.toString(),
      isActive: listings[index].isActive,
    }))
  } catch (error) {
    console.error("Error getting all listed items:", error)
    return []
  }
}

async function getAllOffers() {
  try {
    const [tokenIds, offers] = await marketContract.getAllOffers()
    return tokenIds.map((id, index) => ({
      tokenId: id.toString(),
      bidder: offers[index].bidder,
      amount: offers[index].amount.toString(),
    }))
  } catch (error) {
    console.error("Error getting all offers:", error)
    return []
  }
}

async function listItem(tokenId, priceInEther) {
  try {
    const { contract: sContract, signer } = await getSignerContract(
      svgAddress,
      svgAbi
    )
    const { contract: mContract } = await getSignerContract(
      marketAddress,
      marketAbi
    )

    const isApproved = await sContract.isApprovedForAll(
      await signer.getAddress(),
      marketAddress
    )

    if (!isApproved) {
      showNotification("Approving marketplace...", "info", true)
      const tx = await sContract.setApprovalForAll(marketAddress, true)
      await tx.wait()
      showNotification("Marketplace approved!", "success")
    }

    const priceInWei = ethers.parseEther(priceInEther)

    showNotification(
      `Listing SVG #${tokenId} for ${priceInEther} ETH`,
      "info",
      true
    )

    const tx = await mContract.listItem(tokenId, priceInWei)
    await tx.wait()

    showNotification(`Listed SVG #${tokenId}`, "success")

    refreshDisplay()
  } catch (error) {
    const errorMessage = `${error.message.split("(")[0].trim()}`
    showNotification(errorMessage, "warning")
    console.error(error)
  }
}

async function cancelListing(tokenId) {
  try {
    const { contract: mContract } = await getSignerContract(
      marketAddress,
      marketAbi
    )

    showNotification(`Cancelling listing of svg #${tokenId}`, "info", true)

    const tx = await mContract.cancelListing(tokenId)
    await tx.wait()

    showNotification(`Listing of svg #${tokenId} cancelled`, "success")
    refreshDisplay()
  } catch (error) {
    const errorMessage = `${error.message.split("(")[0].trim()}`
    showNotification(errorMessage, "warning")
    console.error(error)
  }
}

async function acceptOffer(tokenId) {
  try {
    const { contract: mContract } = await getSignerContract(
      marketAddress,
      marketAbi
    )

    showNotification(`Accepting offer for SVG #${tokenId}`, "info", true)

    const tx = await mContract.acceptOffer(tokenId)
    await tx.wait()

    showNotification(`Accepted offer for SVG #${tokenId}`, "success")
    refreshDisplay()
  } catch (error) {
    const errorMessage = `${error.message.split("(")[0].trim()}`
    showNotification(errorMessage, "warning")
    console.error(error)
  }
}

async function buyItem(tokenId, priceInWei) {
  try {
    const { contract: mContract } = await getSignerContract(
      marketAddress,
      marketAbi
    )

    showNotification(`Buying SVG #${tokenId}`, "info", true)

    const tx = await mContract.buyItem(tokenId, { value: priceInWei })
    await tx.wait()

    showNotification(`You bought SVG #${tokenId}`, "success")

    refreshDisplay()
  } catch (error) {
    const errorMessage = `${error.message.split("(")[0].trim()}`
    showNotification(errorMessage, "warning")
    console.error(error)
  }
}

async function placeOffer(tokenId, offerAmount) {
  try {
    const { contract: mContract } = await getSignerContract(
      marketAddress,
      marketAbi
    )
    const offerInWei = ethers.parseEther(offerAmount)

    showNotification(
      `Offering ${offerAmount} ETH for SVG #${tokenId}`,
      "info",
      true
    )

    const tx = await mContract.placeOffer(tokenId, { value: offerInWei })
    await tx.wait()

    showNotification(`Offered ${offerAmount} ETH for SVG #${tokenId}`)
    refreshDisplay()
  } catch (error) {
    const errorMessage = `${error.message.split("(")[0].trim()}`
    showNotification(errorMessage, "warning")
    console.error(error)
  }
}

async function cancelOffer(tokenId) {
  try {
    const { contract: mContract } = await getSignerContract(
      marketAddress,
      marketAbi
    )

    showNotification(`Cancelling offer for SVG #${tokenId}`, "info", true)

    const tx = await mContract.cancelOffer(tokenId)
    await tx.wait()

    showNotification(`Cancelled offer for SVG #${tokenId}`, "success")
    refreshDisplay()
  } catch (error) {
    const errorMessage = `${error.message.split("(")[0].trim()}`
    showNotification(errorMessage, "warning")
    console.error(error)
  }
}

async function getSignerContract(contractAddress, contractAbi) {
  try {
    const selectedProvider = providers.find(
      (provider) => provider.info.name === localStorage.getItem("lastWallet")
    )

    await selectedProvider.provider.request({ method: "eth_requestAccounts" })
    const provider = new ethers.BrowserProvider(selectedProvider.provider)
    const signer = await provider.getSigner()

    const contract = new ethers.Contract(contractAddress, contractAbi, signer)

    return { contract, signer }
  } catch (error) {
    console.error(`Error getting contract at ${contractAddress}:`, error)
    throw error
  }
}

function displayOfflineMarket(tokenIds) {
  const allTokenIds = tokenIds.length
    ? tokenIds.map((id) => id.toString())
    : rainbowColors.map((_, index) => (index + 1).toString())
  market.innerHTML = ""
  allTokenIds.forEach((tokenId) => {
    const color = rainbowColors[parseInt(tokenId) - 1]
    const card = createSVGCard(tokenId, color, {
      priceText: "",
      bidText: "",
      buttons: [],
    })
    market.appendChild(card)
  })
}

async function displayAllSVGs(tokenIds = []) {
  if (!rainbowRpc) {
    displayOfflineMarket(tokenIds)
    return
  }

  try {
    const [user, listedItems, allOffers] = await Promise.all([
      getAccount(),
      getAllListedItems(),
      getAllOffers(),
    ])
    const isAccountConnected = user !== null
    const ownedTokenIds = isAccountConnected
      ? await svgContract.tokensOfOwner(user)
      : []

    const validListedItems = await Promise.all(
      listedItems.map(async (item) => {
        try {
          const currentOwner = await svgContract.ownerOf(item.tokenId)
          const seller = item.seller?.toLowerCase()
          return {
            ...item,
            isActive: item.isActive && seller === currentOwner.toLowerCase(),
          }
        } catch (error) {
          console.error(
            `Error checking owner for token ${item.tokenId}:`,
            error
          )
          return { ...item, isActive: false }
        }
      })
    )

    const ownedTokenIdsSet = new Set(ownedTokenIds.map((id) => id.toString()))
    const offerMap = new Map(allOffers.map((offer) => [offer.tokenId, offer]))
    const allTokenIds = tokenIds.length
      ? tokenIds.map((id) => id.toString())
      : rainbowColors.map((_, index) => (index + 1).toString())

    const itemMap = new Map(
      allTokenIds.map((id) => [
        id,
        { tokenId: id, isActive: false, price: "0" },
      ])
    )

    validListedItems.forEach(
      (item) =>
        itemMap.has(item.tokenId) &&
        itemMap.set(item.tokenId, { ...item, isActive: item.isActive })
    )

    const sortedItems = Array.from(itemMap.values()).sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      if (a.isActive) {
        return BigInt(a.price) < BigInt(b.price) ? -1 : 1
      }
      return BigInt(a.tokenId) < BigInt(b.tokenId) ? -1 : 1
    })

    market.innerHTML = ""
    sortedItems.forEach(({ tokenId, isActive, price }) => {
      const color = rainbowColors[parseInt(tokenId) - 1]
      const offer = offerMap.get(tokenId) || {}
      const currentBidder = offer.bidder || null
      const isOwned = ownedTokenIdsSet.has(tokenId)

      const buttons = [
        {
          text: "Offer",
          className: "offer-btn",
          disabled:
            !isAccountConnected ||
            currentBidder?.toLowerCase() === user?.toLowerCase() ||
            isOwned,
        },
        {
          text: "Cancel",
          className: "cancel-offer-btn",
          disabled: !isAccountConnected || !currentBidder || isOwned,
        },
        {
          text: "Buy",
          className: "buy-btn",
          disabled: !isAccountConnected || isOwned || !isActive,
        },
      ]

      const card = createSVGCard(tokenId, color, {
        priceText: isActive ? `${ethers.formatEther(price)} ETH` : "",
        bidText:
          offer.amount > 0
            ? `Offer: ${ethers.formatEther(offer.amount)} ETH`
            : "",
        buttons,
      })
      market.appendChild(card)
    })
  } catch (error) {
    console.error("Error displaying SVGs:", error)
  }
}

function createSVGCard(tokenId, color, options = {}) {
  const {
    container = document.createElement("div"),
    priceText = "",
    bidText = "",
    buttons = [],
  } = options

  container.classList.add("svg-card")

  const svgNamespace = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(svgNamespace, "svg")
  svg.setAttribute("width", "100%")
  svg.setAttribute("height", "100%")
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

  buttons.forEach(({ text, className, disabled }) => {
    const button = document.createElement("button")
    button.textContent = text
    button.classList.add(className)
    if (disabled) {
      button.disabled = true
      button.classList.add("disabled")
    }
    buttonContainer.appendChild(button)
  })

  container.append(svg, label, priceInfo, bidInfo, buttonContainer)

  return container
}

function refreshDisplay() {
  market.innerHTML = ""
  displayAllSVGs()
  showMySVGs()
}

async function getAccount() {
  try {
    const selectedProvider = providers.find(
      (provider) => provider.info.name === localStorage.getItem("lastWallet")
    )

    const accounts = await selectedProvider.provider.request({
      method: "eth_requestAccounts",
    })

    return accounts[0]
  } catch (error) {
    console.error("Error getting account:", error)
    return null
  }
}

/***************************************************
 *                  FILTER FUNCTION
 **************************************************/
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

  market.innerHTML = ""

  displayAllSVGs(validTokenIds)
}

async function getBids() {
  try {
    const [currentAccount, allOffers] = await Promise.all([
      getAccount(),
      getAllOffers(),
    ])

    return allOffers
      .filter(
        (offer) =>
          offer.bidder &&
          offer.amount > 0 &&
          offer.bidder.toLowerCase() === currentAccount.toLowerCase()
      )
      .map((offer) => offer.tokenId)
  } catch (error) {
    console.error("Error getting user bidded tokens:", error)
    return []
  }
}

async function showUserBids() {
  const bids = await getBids()
  if (bids.length === 0) {
    market.innerHTML =
      "<p class='no-bids-message'>You haven't placed any bids yet</p>"
    return
  }
  await displayAllSVGs(bids)
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

  if (isVisible) toggleMySVGs()
  if (currentPage === "index-page") {
    renderSVGsClaim(rainbowColors)
    searchBox.forEach((div) => (div.style.display = "none"))
    filtersBtns.forEach((btn) => (btn.style.display = "none"))
  }
  if (currentPage === "market-page") displayAllSVGs()
  if (!rainbowRpc) rpcCheck()
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

themeToggle.addEventListener("change", toggleDarkMode)

disconnectBtn.addEventListener("click", disconnect)

document.getElementById("rpcBtn").addEventListener("click", () => {
  const rpc = prompt("Enter a RPC URL:")
  if (rpc) {
    localStorage.setItem("rainbowRpc", rpc)
    window.location.reload()
  }
})

mySVGBtns.forEach((btn) => {
  btn.addEventListener("click", toggleMySVGs)
})

searchInputs.forEach((input) => {
  input.addEventListener("input", (event) => {
    const tokenIdInput = event.target.value.trim()
    showTokenById(tokenIdInput)
  })
})

showBids.forEach((btn) => {
  btn.addEventListener("click", showUserBids)
})

clearFil.forEach((btn) => {
  btn.addEventListener("click", displayAllSVGs)
})

document.addEventListener("click", async function (e) {
  if (!e.target.matches("button") || e.target.disabled) return
  const card = e.target.closest(".svg-card")
  if (!card) return
  const tokenId = card.querySelector(".svg-label").textContent.split("#")[1]

  if (e.target.classList.contains("buy-btn")) {
    const priceInfo = card.querySelector(".price-info").textContent
    console.log("Price Info on Click:", priceInfo)
    if (priceInfo) {
      const price = priceInfo.split(" ")[0]
      const priceInWei = ethers.parseEther(price)
      await buyItem(tokenId, priceInWei)
    } else {
      console.log("This item is not listed for sale.")
    }
  } else if (e.target.classList.contains("accept-offer-btn")) {
    await acceptOffer(tokenId)
  } else if (e.target.classList.contains("offer-btn")) {
    const offerAmount = prompt("Enter your offer amount in ETH:")
    if (offerAmount) await placeOffer(tokenId, offerAmount)
  } else if (e.target.classList.contains("cancel-offer-btn")) {
    await cancelOffer(tokenId)
  } else if (e.target.classList.contains("list-btn")) {
    const listingPrice = prompt("Enter listing price in ETH:")
    if (listingPrice) {
      try {
        const priceInEther = parseFloat(listingPrice)
        if (isNaN(priceInEther) || priceInEther <= 0) {
          throw new Error("Invalid price")
        }
        await listItem(tokenId, priceInEther.toString())
      } catch (error) {
        console.error("Error listing item:", error)
        alert("Invalid price. Please enter a valid number greater than 0.")
      }
    }
  } else if (e.target.classList.contains("cancel-list-btn")) {
    await cancelListing(tokenId)
  }
})

window.dispatchEvent(new Event("eip6963:requestProvider"))
