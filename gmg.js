/**********************************************
 * gmg.js
 *
 * 1) Runs on https://gmgn.ai/meme*
 * 2) Finds <a href="https://pump.fun/...">
 * 3) Inserts a "SolDeck" button BEFORE each link (inline)
 * 4) On click:
 *    - DexScreener fetch
 *    - if empty => "dex not paid"
 *    - else => e.g. "Ad Payment: Processing 5 Mins Ago | Dex Update: Approved 2 Hours Ago"
 *    - sets button text
 *    - stops link from clicking
 **********************************************/

(function initGMGNSolDeck() {
  console.log("SolDeck gmg.js loaded for GMGN.");

  // 1) Format time-ago helper
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

  // 2) Capitalize helper
  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // 3) Parse Dex data into a single line
  function parseDexData(data) {
    const typeMap = {
      tokenAd: "Ad Payment",
      tokenProfile: "Dex Update",
    };

    if (!Array.isArray(data) || data.length === 0) {
      return "dex not paid";
    }
    const lines = data.map((item) => {
      const label = typeMap[item.type] || item.type;
      const status = capitalize(item.status);
      const timeAgo = formatTimeAgo(item.paymentTimestamp);
      return `${label}: ${status} ${timeAgo}`;
    });
    return lines.join(" | ");
  }

  // 4) On DOM load + mutations, insert buttons
  document.addEventListener("DOMContentLoaded", addSolDeckButtonsOnGMGN);
  const observer = new MutationObserver(addSolDeckButtonsOnGMGN);
  observer.observe(document.body, { childList: true, subtree: true });

  function addSolDeckButtonsOnGMGN() {
    // Target <a href="https://pump.fun/...">
    const pumpFunLinks = document.querySelectorAll('a[href*="pump.fun/"]');

    pumpFunLinks.forEach((link) => {
      if (link.dataset.hasGmgnSolDeckButton) return;
      link.dataset.hasGmgnSolDeckButton = "true";

      // Make the link inline-block so it doesn't shift onto a new line
      link.style.display = "inline-block";

      console.log("Inserting SolDeck button BEFORE link:", link.href);

      // 1) Create the button (inline-block as well)
      const button = document.createElement("button");
      button.textContent = "SolDeck";
      button.style.display = "inline-block";
      button.style.marginRight = "5px";
      button.style.padding = "0 10px";
      button.style.height = "1.75rem";
      button.style.background = "#15171a";
      button.style.border = "1px solid silver";
      button.style.color = "#b9babb";
      button.style.borderRadius = "9999px";
      button.style.userSelect = "none";
      button.style.cursor = "pointer";
      button.style.fontSize = "12px";
      button.style.lineHeight = "1.2";
      button.style.outline = "none";

      // 2) Insert BEFORE the link => side by side
      link.insertAdjacentElement("beforebegin", button);

      // 3) DexScreener fetch on click
      let fetched = false;
      button.addEventListener("click", async (e) => {
        // Stop link from being clicked
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (fetched) return; // only fetch once

        const tokenAddress = link.href.replace(/^https?:\/\/(www\.)?pump\.fun\//, "");
        const apiUrl = `https://api.dexscreener.com/orders/v1/solana/${tokenAddress}`;
        console.log("Fetching DexScreener data =>", apiUrl);

        try {
          const resp = await fetch(apiUrl);
          if (!resp.ok) {
            throw new Error(`HTTP error: ${resp.status}`);
          }
          const data = await resp.json();
          const result = parseDexData(data);
          button.textContent = result;
          fetched = true;
        } catch (err) {
          console.error("DexScreener error =>", err);
          button.textContent = `Error: ${err.message}`;
        }
      });
    });
  }
})();
