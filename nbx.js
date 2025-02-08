(function initSolDeckExtension() {
  console.log("SolDeck nbx.js loaded (only on neo.bullx.io).");

  // Helper: formatTimeAgo
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

  // Helper: capitalize
  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Parse DexScreener data
  function parseDexData(data) {
    const typeMap = {
      tokenAd: "Ad Payment",
      tokenProfile: "Dex Update",
    };

    if (!Array.isArray(data) || data.length === 0) {
      return "dex not paid";
    }

    return data
      .map((item) => {
        const label = typeMap[item.type] || item.type;
        const status = capitalize(item.status);
        const timeAgo = formatTimeAgo(item.paymentTimestamp);
        return `${label}: ${status} ${timeAgo}`;
      })
      .join("\n");
  }

  function addSolDeckButtons() {
    // Find all pump.fun links.
    const pumpFunLinks = document.querySelectorAll('a[href^="https://pump.fun/"]');
    pumpFunLinks.forEach((link) => {
      // Process each pump.fun link only once.
      if (link.dataset.hasSolDeckButton) return;
      link.dataset.hasSolDeckButton = "true";

      console.log("Processing pump.fun link:", link.href);

      // Extract the token address from the pump.fun link.
      const tokenAddress = link.href.replace("https://pump.fun/", "");

      // Check if there is an x.com search link whose query parameter "q" contains this tokenAddress.
      const xLinks = document.querySelectorAll('a[href^="https://x.com/search?q="]');
      let matchFound = false;
      xLinks.forEach((xlink) => {
        try {
          const urlObj = new URL(xlink.href);
          const qParam = urlObj.searchParams.get("q");
          if (qParam && qParam.includes(tokenAddress)) {
            matchFound = true;
          }
        } catch (e) {
          console.error("Error parsing x.com link:", e);
        }
      });
      if (!matchFound) {
        console.log("No matching x.com link found for token:", tokenAddress);
        return; // Do not add the button if there is no matching x.com link.
      }

      // Create a container for the SolDeck button.
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.display = "inline-block";
      container.style.zIndex = "10000";

      // Ensure the parent container uses flex so that the SolDeck button and pump.fun link remain on one line.
      const parent = link.parentElement;
      if (parent) {
        parent.style.display = "flex";
        parent.style.alignItems = "center";
        parent.insertBefore(container, link);
      } else {
        link.insertAdjacentElement("beforebegin", container);
      }

      // Create the SolDeck button.
      const button = document.createElement("button");
      button.textContent = "SolDeck";
      button.title = ""; // Remove tooltip text.
      button.style.cssText = `
        padding: 0 10px;
        height: 1.75rem;
        background: #15171a;
        border: 1px solid silver;
        color: #b9babb;
        border-radius: 9999px;
        margin-right: 5px;
        user-select: none;
        cursor: pointer;
        font-size: 12px;
        line-height: 1.2;
        outline: none;
        white-space: pre;
      `;
      // Hardware acceleration hints.
      button.style.willChange = "transform, opacity";
      button.style.transform = "translateZ(0)";
      button.style.zIndex = "10001";

      container.appendChild(button);

      let fetched = false;

      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!fetched) {
          // Immediately update the button text.
          button.textContent = "Loading...";
          // Force reflow so that the UI updates right away.
          void button.offsetHeight;
          // Use requestAnimationFrame so the UI repaint occurs before the API call.
          requestAnimationFrame(async () => {
            const apiUrl = `https://api.dexscreener.com/orders/v1/solana/${tokenAddress}`;
            console.log("Fetching DexScreener data for:", tokenAddress);
            try {
              const resp = await fetch(apiUrl);
              if (!resp.ok) {
                throw new Error(`HTTP error: ${resp.status}`);
              }
              const data = await resp.json();
              const resultText = parseDexData(data);
              fetched = true;
              button.textContent = resultText;
            } catch (err) {
              console.error("DexScreener error:", err);
              fetched = true;
              button.textContent = `Error: ${err.message}`;
            }
          });
        }
      });
    });
  }

  // Run once when the DOM is loaded.
  document.addEventListener("DOMContentLoaded", addSolDeckButtons);
  // Also observe DOM mutations in case new pump.fun links are added dynamically.
  const observer = new MutationObserver(addSolDeckButtons);
  observer.observe(document.body, { childList: true, subtree: true });
})();
