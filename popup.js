document.addEventListener("DOMContentLoaded", async () => {
  // Elements for the main view
  const messageEl = document.getElementById("message");
  const buttonsContainer = document.getElementById("buttons-container");
  const pumpBtn = document.getElementById("pump-btn");
  const bullxBtn = document.getElementById("bullx-btn");
  const neoBullxBtn = document.getElementById("neo-bullx-btn");
  const photonBtn = document.getElementById("photon-btn");
  const dexsBtn = document.getElementById("dexs-btn");
  const gmgnBtn = document.getElementById("gmgn-btn");
  const trojanBtn = document.getElementById("trojan-btn");
  const apeBtn = document.getElementById("ape-btn");
  const settingsLink = document.getElementById("settings-link");

  // Elements for the settings view
  const settingsView = document.getElementById("settings-view");
  const mainView = document.getElementById("main-view");
  const apiKeyInput = document.getElementById("apiKey-input");
  const saveApiKeyBtn = document.getElementById("save-apiKey-btn");
  const apiStatus = document.getElementById("apiStatus");
  const backBtn = document.getElementById("back-btn");
  const pumpOpt = document.getElementById("pump-option");
  const bullxOpt = document.getElementById("bullx-option");
  const neoBullxOpt = document.getElementById("neo-bullx-option");
  const photonOpt = document.getElementById("photon-option");
  const dexsOpt = document.getElementById("dexs-option");
  const gmgnOpt = document.getElementById("gmgn-option");
  const trojanOpt = document.getElementById("trojan-option");
  const apeOpt = document.getElementById("ape-option");
  const saveOptionsBtn = document.getElementById("save-options-btn");
  const optionsStatus = document.getElementById("optionsStatus");

  // Toggle to settings view.
  settingsLink.addEventListener("click", (e) => {
    e.preventDefault();
    mainView.style.display = "none";
    settingsView.style.display = "block";
    // Pre-fill the API key.
    chrome.storage.sync.get("openaiApiKey", (data) => {
      if (data.openaiApiKey) {
        apiKeyInput.value = data.openaiApiKey;
      }
    });
    // Load button-visibility options.
    chrome.storage.sync.get({
      pumpShown: true,
      bullxShown: true,
      neoBullxShown: true,
      photonShown: true,
      dexsShown: true,
      gmgnShown: true,
      trojanShown: true,
      apeShown: true
    }, (items) => {
      pumpOpt.checked = items.pumpShown;
      bullxOpt.checked = items.bullxShown;
      neoBullxOpt.checked = items.neoBullxShown;
      photonOpt.checked = items.photonShown;
      dexsOpt.checked = items.dexsShown;
      gmgnOpt.checked = items.gmgnShown;
      trojanOpt.checked = items.trojanShown;
      apeOpt.checked = items.apeShown;
    });
  });

  // Back button returns to main view.
  backBtn.addEventListener("click", () => {
    settingsView.style.display = "none";
    mainView.style.display = "block";
  });

  // Save API key.
  saveApiKeyBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
        apiStatus.textContent = "API key saved!";
        setTimeout(() => { apiStatus.textContent = ""; }, 2000);
      });
    } else {
      apiStatus.textContent = "Please enter a valid API key.";
    }
  });

  // Save button-visibility options.
  saveOptionsBtn.addEventListener("click", () => {
    chrome.storage.sync.set({
      pumpShown: pumpOpt.checked,
      bullxShown: bullxOpt.checked,
      neoBullxShown: neoBullxOpt.checked,
      photonShown: photonOpt.checked,
      dexsShown: dexsOpt.checked,
      gmgnShown: gmgnOpt.checked,
      trojanShown: trojanOpt.checked,
      apeShown: apeOpt.checked
    }, () => {
      optionsStatus.textContent = "Options saved!";
      setTimeout(() => { optionsStatus.textContent = ""; }, 2000);
    });
  });

  // --- Original token extraction and button logic ---
  try {
    const {
      pumpShown = true,
      bullxShown = true,
      neoBullxShown = true,
      photonShown = true,
      dexsShown = true,
      gmgnShown = true,
      trojanShown = true,
      apeShown = true,
    } = await new Promise((resolve) => {
      chrome.storage.sync.get({
        pumpShown: true,
        bullxShown: true,
        neoBullxShown: true,
        photonShown: true,
        dexsShown: true,
        gmgnShown: true,
        trojanShown: true,
        apeShown: true,
      }, (items) => resolve(items));
    });

    pumpBtn.style.display = pumpShown ? "inline-block" : "none";
    bullxBtn.style.display = bullxShown ? "inline-block" : "none";
    neoBullxBtn.style.display = neoBullxShown ? "inline-block" : "none";
    photonBtn.style.display = photonShown ? "inline-block" : "none";
    dexsBtn.style.display = dexsShown ? "inline-block" : "none";
    gmgnBtn.style.display = gmgnShown ? "inline-block" : "none";
    trojanBtn.style.display = trojanShown ? "inline-block" : "none";
    apeBtn.style.display = apeShown ? "inline-block" : "none";

    // Determine token address from the active tab.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      messageEl.textContent = "No active tab found.";
      return;
    }
    const url = new URL(tab.url);
    const supportedDomains = [
      "dexscreener.com",
      "bullx.io",
      "photon-sol.tinyastro.io",
      "gmgn.ai",
      "neo.bullx.io",
      "pump.fun",
    ];
    if (!supportedDomains.some(domain => url.hostname.includes(domain))) {
      messageEl.textContent = "Not on a supported page.";
      return;
    }

    let tokenAddress = null;
    if (url.hostname === "gmgn.ai") {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const solscanAnchor = document.querySelector('a[href^="https://solscan.io/token/"]');
          return solscanAnchor ? solscanAnchor.href : null;
        },
      });
      if (result.result) {
        tokenAddress = new URL(result.result).pathname.replace("/token/", "");
      } else {
        messageEl.textContent = "No Solscan token link found on this page.";
        return;
      }
    } else if (url.hostname === "pump.fun" && url.pathname.startsWith("/coin/")) {
      tokenAddress = url.pathname.replace("/coin/", "");
    } else if (
      ["bullx.io", "photon-sol.tinyastro.io", "neo.bullx.io"].some(domain => url.hostname.includes(domain))
    ) {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const pumpAnchor = document.querySelector('a[href^="https://pump.fun/"]');
          return pumpAnchor ? pumpAnchor.href : null;
        },
      });
      if (result.result) {
        tokenAddress = new URL(result.result).pathname.replace("/", "");
      } else {
        messageEl.textContent = "No pump.fun token link found on this page.";
        return;
      }
    } else if (url.hostname === "dexscreener.com" && url.pathname.startsWith("/solana")) {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const anchor = document.querySelector('a[href^="https://solscan.io/token/"]');
          return anchor ? anchor.href : null;
        },
      });
      if (result.result) {
        tokenAddress = result.result.replace("https://solscan.io/token/", "");
      } else {
        messageEl.textContent = "No Solscan token link found on this page.";
        return;
      }
    } else {
      messageEl.textContent = "Page not supported.";
      return;
    }

    // Hide "Loading..." and show the buttons.
    messageEl.style.display = "none";
    buttonsContainer.style.display = "block";

    pumpBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: `https://pump.fun/${tokenAddress}` });
    });
    bullxBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: `https://bullx.io/terminal?chainId=1399811149&address=${tokenAddress}` });
    });
    neoBullxBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: `https://neo.bullx.io/terminal?chainId=1399811149&address=${tokenAddress}&r=51S571STVJQ&l=en&r=51S571STVJQ` });
    });
    photonBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: `https://photon-sol.tinyastro.io/en/lp/${tokenAddress}` });
    });
    dexsBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: `https://dexscreener.com/solana/${tokenAddress}` });
    });
    gmgnBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: `https://gmgn.ai/sol/token/x9jrJfiB_${tokenAddress}` });
    });
    trojanBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: `https://t.me/solana_trojanbot?start=r-soldeckadmin-${tokenAddress}` });
    });
    apeBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: `https://ape.pro/solana/${tokenAddress}/?ref=r1BYVsxdhZGY` });
    });
  } catch (error) {
    console.error("Error in popup.js:", error);
    messageEl.textContent = "An unexpected error occurred.";
  }
});
