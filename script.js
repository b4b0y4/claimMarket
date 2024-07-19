import { ethers } from "./ethers.min.js"
import { networkConfigs, contractAddress, abi } from "./constants.js"

// DOM Elements
const squaresBox = document.getElementById("squaresBox")
const networkBtn = document.getElementById("networkBtn")
const chevron = networkBtn.querySelector("span i")
const chainList = document.getElementById("chainList")
const connectBtn = document.getElementById("connectBtn")
const walletList = document.getElementById("walletList")
const walletBox = document.getElementById("wallets")
const whatsBtn = document.getElementById("whats")
const disconnectBtn = document.getElementById("disconnect")
const overlay = document.getElementById("overlay")
const networkIcon = document.getElementById("networkIcon")
const notification = document.getElementById("notification")
const profileBtn = document.getElementById("profileBtn")
const mySVGs = document.getElementById("mySVGs")

const providers = []

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
  chainList.classList.remove("show")
  chevron.classList.remove("rotate")

  const connected = localStorage.getItem("connected")

  toggleDisplay(whatsBtn, connected ? false : true)
  toggleDisplay(disconnectBtn, connected ? true : false)
  toggleDisplay(profileBtn, connected ? true : false)
}

function updateSettings() {
  const hasProvider = providers.length > 0
  document.getElementById("settings").classList.toggle("nowallet", !hasProvider)
}

function renderChainList() {
  chainList.innerHTML = ""
  const currentChainId = localStorage.getItem("currentChainId")

  Object.entries(networkConfigs).forEach(([networkName, networkConfig]) => {
    if (networkConfig.showInUI) {
      const button = createButton(networkConfig, () =>
        switchNetwork(networkConfig)
      )
      button.id = networkName
      const indicator = button.querySelector(".indicator")
      indicator.style.display =
        networkConfig.chainIdHex === currentChainId ? "inline-block" : "none"

      chainList.appendChild(button)
    }
  })
}

async function switchNetwork(newNetwork) {
  chainList.classList.remove("show")
  chevron.classList.remove("rotate")
  const selectedProvider = providers.find(
    (provider) => provider.info.name === localStorage.getItem("lastWallet")
  )
  try {
    await selectedProvider.provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: newNetwork.chainIdHex }],
    })
    localStorage.setItem("currentChainId", newNetwork.chainIdHex)

    renderChainList()
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
  renderChainList()
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
  ;[(walletList, chainList, chevron, connectBtn)].forEach((el) => {
    el.classList.remove("show", "rotate", "connected")
  })

  toggleDisplay(overlay, false)
  toggleDisplay(walletBox, true)
  updateSettings()
  renderWallets()
  renderChainList()

  location.reload()
}

function showNotification(message, type = "info") {
  if (message) {
    notification.textContent = message
    notification.classList.add("show", type)
  } else {
    notification.classList.remove("show")
    setTimeout(() => {
      notification.classList.remove("info", "warning")
      notification.textContent = ""
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
    renderChainList()
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
const sepoliaProvider = new ethers.JsonRpcProvider(
  networkConfigs.sepolia.rpcUrl
)

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
  button.textContent = isClaimed ? `Claimed` : `Claim ${id}`
  button.classList.add("claim-button")
  button.disabled = isClaimed

  if (isClaimed) {
    button.style.opacity = "0.9"
    svg.style.filter = "brightness(0.5)"
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

async function renderSquaresWithButtons(colors) {
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
renderSquaresWithButtons(rainbowColors)

/***************************************************
 *                  DISPLAY MY SVG
 **************************************************/
async function showMySVGs() {
  const selectedProvider = providers.find(
    (provider) => provider.info.name === localStorage.getItem("lastWallet")
  )
  squaresBox.style.display = "none"
  mySVGs.style.display = "flex"
  walletList.classList.remove("show")

  if (selectedProvider) {
    try {
      const accounts = await selectedProvider.provider.request({
        method: "eth_requestAccounts",
      })
      const provider = new ethers.JsonRpcProvider(networkConfigs.sepolia.rpcUrl)
      const contract = new ethers.Contract(contractAddress, abi, provider)
      const balance = await contract.balanceOf(accounts[0])

      mySVGs.innerHTML = ""

      if (balance.toString() === "0") {
        mySVGs.textContent = "You don't own any Rainbow SVGs yet."
        return
      }

      const ownedTokenIds = await getSVGOwned(contract, accounts[0], balance)

      for (const tokenId of ownedTokenIds) {
        const tokenURI = await contract.tokenURI(tokenId)
        const svg = await extractSVGFromTokenURI(tokenURI)
        displaySVG(svg, tokenId)
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

async function extractSVGFromTokenURI(tokenURI) {
  const base64Data = tokenURI.split(",")[1]
  const jsonString = atob(base64Data)
  const jsonData = JSON.parse(jsonString)
  const svgBase64 = jsonData.image.split(",")[1]
  return atob(svgBase64)
}

function displaySVG(svg, tokenId) {
  const container = document.createElement("div")
  container.innerHTML = svg
  container.querySelector("svg").setAttribute("width", "100")
  container.querySelector("svg").setAttribute("height", "100")

  const label = document.createElement("p")
  label.textContent = `SVG #${tokenId}`

  container.appendChild(label)
  mySVGs.appendChild(container)
}

/***************************************************
 *              EVENT LISTENERS
 **************************************************/
window.addEventListener("eip6963:announceProvider", (event) => {
  const providerDetail = event.detail
  providers.push(providerDetail)
  renderWallets()

  if (localStorage.getItem("connected"))
    selectWallet(localStorage.getItem("lastWallet"))

  console.log(`Discovered provider: ${providerDetail.info.name}`)
})

window.addEventListener("load", async () => {
  const storedChainId = localStorage.getItem("currentChainId")
  if (storedChainId) updateNetworkButton(storedChainId)
  updateSettings()
  const selectedProvider = providers.find(
    (provider) => provider.info.name === localStorage.getItem("lastWallet")
  )
  if (selectedProvider) providerEvent(selectedProvider)
  renderChainList()

  const savedDarkMode = JSON.parse(localStorage.getItem("darkMode"))
  setDarkMode(savedDarkMode === true)
  root.classList.remove("no-flash")
})

networkBtn.addEventListener("click", (event) => {
  event.stopPropagation()
  chainList.classList.toggle("show")
  chevron.classList.toggle("rotate")
  walletList.classList.remove("show")
})

connectBtn.addEventListener("click", (event) => {
  event.stopPropagation()
  togglewalletList()
})

document.addEventListener("click", () => {
  chainList.classList.remove("show")
  walletList.classList.remove("show")
  chevron.classList.remove("rotate")
})

chainList.addEventListener("click", (event) => event.stopPropagation())

walletList.addEventListener("click", (event) => event.stopPropagation())

disconnectBtn.addEventListener("click", disconnect)

themeToggle.addEventListener("change", toggleDarkMode)

profileBtn.addEventListener("click", showMySVGs)

window.dispatchEvent(new Event("eip6963:requestProvider"))
