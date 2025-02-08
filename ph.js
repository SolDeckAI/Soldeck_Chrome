(function initPhotonSolDeck() {
  console.log("SolDeck ph.js loaded for Photon.");

  // 1) Helper: formatTimeAgo
  function formatTimeAgo(timestampMs) {
    const now = Date.now();
    let diffSec = Math.floor((now - timestampMs) / 1000);
    if (diffSec < 0) diffSec = 0;

    const hours = Math.floor(diffSec / 3600);
    diffSec %= 3600;
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours} Hours`);
    if (mins > 0) parts.push(`${mins} Mins`);
    if (secs > 0) parts.push(`${secs} Seconds`);
    if (parts.length === 0) parts.push("0 Seconds");

    return parts.join(" ") + " Ago";
  }

  // 2) Helper: capitalize
  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // 3) parseDexData => returns a single-line string summarizing the items
  function parseDexData(data) {
    const typeMap = {
      tokenAd: "Ad Payment",
      tokenProfile: "Dex Update",
    };

    // If empty or invalid, return "dex not paid"
    if (!Array.isArray(data) || data.length === 0) {
      return "dex not paid";
    }

    // For each entry, create "Label: Status TimeAgo"
    const lines = data.map((item) => {
      const label = typeMap[item.type] || item.type;   // fallback if unknown
      const status = capitalize(item.status);
      const timeAgo = formatTimeAgo(item.paymentTimestamp);
      return `${label}: ${status} ${timeAgo}`;
    });

    // Join them into a single line with " | " as a separator
    // e.g. "Ad Payment: Processing 10 Mins Ago | Dex Update: Approved 1 Hours 2 Mins Ago"
    return lines.join(" | ");
  }

  // 4) Main logic: watch for pump.fun links
  document.addEventListener("DOMContentLoaded", addSolDeckButtonsOnPhoton);
  const observer = new MutationObserver(addSolDeckButtonsOnPhoton);
  observer.observe(document.body, { childList: true, subtree: true });

  function addSolDeckButtonsOnPhoton() {
    // Find all <a href="https://pump.fun/...">
    const pumpFunLinks = document.querySelectorAll('a[href^="https://pump.fun/"]');

    pumpFunLinks.forEach((link) => {
      // Skip if we've already added a button
      if (link.dataset.hasPhotonSolDeckButton) return;
      link.dataset.hasPhotonSolDeckButton = "true";

      console.log("Inserting SolDeck button after link:", link.href);

      // Insert a container AFTER the link
      const container = document.createElement("div");
      link.insertAdjacentElement("afterend", container);

      // Create the "SolDeck" button
      const button = document.createElement("button");
      button.textContent = "SolDeck";   // initial text
      button.style.cssText = `
        position: relative;
        z-index: 9999999;       /* keep it on top if needed */
        margin-left: 5px;
        padding: 0 10px;
        height: 1.75rem;
        background: #15171a;
        border: 1px solid silver;
        color: #b9babb;
        border-radius: 9999px;  /* fully rounded edges */
        user-select: none;
        cursor: pointer;
        font-size: 12px;
        line-height: 1.2;
        outline: none;
      `;
      container.appendChild(button);

      let fetched = false;

      button.addEventListener("click", async () => {
        // If we've already fetched, do nothing
        if (fetched) return;

        // Extract token address from the link
        const tokenAddress = link.href.replace("https://pump.fun/", "");
        const apiUrl = `https://api.dexscreener.com/orders/v1/solana/${tokenAddress}`;
        console.log("Fetching DexScreener data (Photon):", apiUrl);

        try {
          const resp = await fetch(apiUrl);
          if (!resp.ok) {
            throw new Error(`HTTP error: ${resp.status}`);
          }
          const data = await resp.json();

          // parseDexData => single-line summary or "dex not paid"
          const result = parseDexData(data);
          button.textContent = result;
          fetched = true;
        } catch (err) {
          console.error("DexScreener fetch error:", err);
          button.textContent = `Error: ${err.message}`;
        }
      });
    });
  }
})();
