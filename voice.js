// voice.js

(function () {
  console.log("voice.js loaded on this page.");

  const VOICE_BUTTON_ID = "voice-button";
  let currentContractAddress = null; // holds the currently injected contract address
  let tokenAddress = "";

  // Global recording state and functions for keybind use:
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;

  // --- Hide preset Photon UI if present ---
  if (location.hostname.includes("photon-sol.tinyastro.io")) {
    setTimeout(() => {
      const presetButtons = document.querySelectorAll("button.ant-btn");
      presetButtons.forEach((btn) => {
        if (btn.innerText.includes("Buy") || btn.innerText.includes("Sell")) {
          btn.style.display = "none";
          console.log("Hid a preset Photon button:", btn.innerText);
        }
      });
    }, 1000);
  }

  // --- Only allow voice commands on supported URLs ---
  function isAllowedUrl() {
    const href = window.location.href;
    if (href.startsWith("https://gmgn.ai/sol/token")) return true;
    if (href.indexOf("neo.bullx.io/terminal?chainId") !== -1) return true;
    if (href.startsWith("https://photon-sol.tinyastro.io/en/lp")) return true;
    if (href.startsWith("https://dexscreener.com/solana")) return true;
    return false;
  }
  if (!isAllowedUrl()) {
    console.log("voice.js: This URL is not allowed for voice injection.");
    return;
  }

  // --- Extract token address using logic from other scripts ---
  (function extractTokenAddress() {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.hostname === "gmgn.ai") {
      // For gmgn.ai, look for a canvas whose aria-label starts with "Chart for sol/"
      const canvas = document.querySelector('canvas[aria-label^="Chart for sol/"]');
      if (canvas) {
        const ariaLabel = canvas.getAttribute("aria-label");
        // Expected format: "Chart for sol/6y6PoJsRz9EUHi9ARw7SHnc9ZHmW7bdfkf2nrGZjpump/USD/MCAP, 15 seconds"
        const parts = ariaLabel.split("/");
        if (parts.length >= 2) {
          tokenAddress = parts[1];
        }
      }
    } else if (currentUrl.hostname === "pump.fun" && currentUrl.pathname.startsWith("/coin/")) {
      tokenAddress = currentUrl.pathname.replace("/coin/", "");
    } else if (["bullx.io", "photon-sol.tinyastro.io", "neo.bullx.io"].some(domain => currentUrl.hostname.includes(domain))) {
      const pumpAnchor = document.querySelector('a[href^="https://pump.fun/"]');
      if (pumpAnchor) {
        tokenAddress = new URL(pumpAnchor.href).pathname.replace("/", "");
      }
    } else if (currentUrl.hostname === "dexscreener.com" && currentUrl.pathname.startsWith("/solana")) {
      const anchor = document.querySelector('a[href^="https://solscan.io/token/"]');
      if (anchor) {
        tokenAddress = anchor.href.replace("https://solscan.io/token/", "");
      }
    } else {
      console.log("No token extraction logic for this page.");
    }
    console.log("Extracted tokenAddress:", tokenAddress);
  })();

  // --- Remove any existing voice button ---
  function removeVoiceButton() {
    const existing = document.getElementById(VOICE_BUTTON_ID);
    if (existing) {
      existing.remove();
      console.log("Removed existing voice button.");
    }
  }

  // --- Helper: Click an element by XPath ---
  function clickElementByXPath(xpath) {
    const element = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    if (element) {
      element.click();
      console.log("Clicked element:", xpath);
    } else {
      console.warn("Element not found for XPath:", xpath);
    }
    return element;
  }

  // --- Helper: Set an input’s value and dispatch events ---
  function setInputValueAndDispatch(input, value) {
    input.focus();
    input.value = value;
    const inputEvent = new Event("input", { bubbles: true, cancelable: true });
    input.dispatchEvent(inputEvent);
    const changeEvent = new Event("change", { bubbles: true, cancelable: true });
    input.dispatchEvent(changeEvent);
    console.log("Set input value and dispatched events for value:", value);
  }

  // --- Helper: Find input via XPath and set its value ---
  function setInputValueByXPath(xpath, value) {
    const input = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    if (input) {
      setInputValueAndDispatch(input, value);
      console.log("Set input value for:", xpath, "to", value);
    } else {
      console.warn("Input element not found for XPath:", xpath);
    }
    return input;
  }

  // --- Executor for a trade or open command ---
  function executeTradeCommand(command) {
    console.log("Executing command:", command);
    if (!command.token && tokenAddress) {
      command.token = tokenAddress;
      console.log("Filled missing token from extraction:", command.token);
    }
    if (!command || !command.action) {
      console.log("No valid command returned; doing nothing.");
      return;
    }
    if (command.action === "open") {
      let url = "";
      if (command.site === "pump") {
        url = `https://pump.fun/${command.token || ""}`;
      } else if (command.site === "bullx") {
        url = `https://bullx.io/terminal?chainId=1399811149&address=${command.token || ""}`;
      } else if (command.site === "neo") {
        url = `https://neo.bullx.io/terminal?chainId=1399811149&address=${command.token || ""}&r=51S571STVJQ&l=en&r=51S571STVJQ`;
      } else if (command.site === "photon") {
        url = `https://photon-sol.tinyastro.io/en/lp/${command.token || ""}`;
      } else if (command.site === "dexscreener") {
        url = `https://dexscreener.com/solana/${command.token || ""}`;
      } else if (command.site === "gmgn") {
        url = `https://gmgn.ai/sol/token/x9jrJfiB_${command.token || ""}`;
      } else if (command.site === "trojan") {
        url = `https://t.me/solana_trojanbot?start=r-soldeckadmin-${command.token || ""}`;
      } else if (command.site === "banana") {
        url = `https://t.me/BananaGunSniper_bot?start=ref_soldeck_${command.token || ""}`;
      } else if (command.site === "ape") {
        url = `https://ape.pro/solana/${command.token || ""}/?ref=r1BYVsxdhZGY`;
      }
      if (url) {
        console.log("Opening URL:", url);
        window.open(url, "_blank");
      }
    } else if (command.action === "trade") {
      if (window.location.href.indexOf("neo.bullx.io") !== -1) {
        if (command.tradeType === "buy") {
          clickElementByXPath(
            '//*[@id="root"]/div[1]/div[2]/main/div/div[2]/aside/div/div[3]/div/div/div/div[1]/div[3]/div[1]/div/div/label[1]/div'
          );
          setTimeout(() => {
            setInputValueByXPath(
              '//*[@id="rc-tabs-2-panel-buy"]/div/div[2]/div/div[1]/div[1]/div/div/div[2]/div/div/input',
              command.amount || ".1"
            );
            setTimeout(() => {
              clickElementByXPath(
                '//*[@id="rc-tabs-2-panel-buy"]/div/div[2]/div/footer/div[3]/button'
              );
            }, 500);
          }, 500);
        } else if (command.tradeType === "sell") {
          clickElementByXPath(
            '//*[@id="root"]/div[1]/div[2]/main/div/div[2]/aside/div/div[3]/div/div/div/div[1]/div[3]/div[1]/div/div/label[2]/div'
          );
          setTimeout(() => {
            clickElementByXPath('//*[@id="rc-tabs-2-panel-sell"]/div/div[2]/div/div[1]/div[2]/button[4]');
            setTimeout(() => {
              clickElementByXPath(
                '//*[@id="rc-tabs-2-panel-sell"]/div/div[2]/div/footer/div[3]/button'
              );
            }, 500);
          }, 500);
        }
      } else if (window.location.href.indexOf("photon-sol.tinyastro.io") !== -1 || command.site === "photon") {
        if (command.tradeType === "buy") {
          clickElementByXPath(
            '/html/body/div[7]/div[9]/div/div[1]/div/div[3]/div[1]/div[1]/div'
          );
          setTimeout(() => {
            setInputValueByXPath(
              '/html/body/div[7]/div[9]/div/div[1]/div/div[3]/div[2]/div[1]/div/div/div[2]/div[2]/div[2]/div/div/div[2]/input',
              command.amount || ".1"
            );
            setTimeout(() => {
              clickElementByXPath(
                '/html/body/div[7]/div[9]/div/div[1]/div/div[3]/div[2]/div[1]/div/div/div[2]/div[4]/button/div[2]'
              );
            }, 500);
          }, 500);
        } else if (command.tradeType === "sell") {
          clickElementByXPath(
            '/html/body/div[7]/div[9]/div/div[1]/div/div[3]/div[1]/div[2]/div'
          );
          setTimeout(() => {
            clickElementByXPath(
              '/html/body/div[7]/div[9]/div/div[1]/div/div[3]/div[2]/div[2]/div/div/div[2]/div[1]/div/div[2]/div[2]/div/div[2]/div/div/div[1]/div/div[1]/div'
            );
            setTimeout(() => {
              clickElementByXPath(
                '/html/body/div[7]/div[9]/div/div[1]/div/div[3]/div[2]/div[2]/div/div/div[2]/div[1]/div/div[2]/div[2]/div/div[2]/div/div/div[1]/div/div[2]/div/div[2]'
              );
              setTimeout(() => {
                setInputValueByXPath(
                  '/html/body/div[7]/div[9]/div/div[1]/div/div[3]/div[2]/div[2]/div/div/div[2]/div[1]/div/div[2]/div[2]/div/div[2]/div/div/div[2]/input',
                  command.amount || "100"
                );
                setTimeout(() => {
                  clickElementByXPath(
                    '/html/body/div[7]/div[9]/div/div[1]/div/div[3]/div[2]/div[2]/div/div/div[2]/div[1]/div/button'
                  );
                }, 500);
              }, 500);
            }, 500);
          }, 500);
        }
      }
    }
  }

  // --- processAudio: record audio, send to Whisper, then forward transcript to ChatGPT ---
  async function processAudio(audioBlob) {
    chrome.storage.sync.get("openaiApiKey", async (data) => {
      const apiKey = data.openaiApiKey;
      if (!apiKey) {
        alert("Please set your OpenAI API key in the extension Settings.");
        return;
      }
      const formData = new FormData();
      const audioFile = new File([audioBlob], "audio.webm", { type: "audio/webm" });
      formData.append("file", audioFile);
      formData.append("model", "whisper-1");

      try {
        console.log("Sending audio to Whisper...");
        const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData
        });
        if (!whisperResp.ok) {
          const errMsg = await whisperResp.text();
          throw new Error(errMsg);
        }
        const whisperJson = await whisperResp.json();
        const transcript = whisperJson.text;
        console.log("Whisper transcript:", transcript);

        // Updated system prompt with explicit instructions and context for the correct links.
        const systemPrompt = `
You are a crypto trading assistant for Solana.
Current token address: ${tokenAddress}
When generating commands, use the following link formats (with {token_address} replaced by the token):
- Neo Link: https://neo.bullx.io/terminal?chainId=1399811149&address={token_address}&r=51S571STVJQ&l=en&r=51S571STVJQ
- Photon Link: https://photon-sol.tinyastro.io/en/lp/{token_address}
- Dexscreener Link: https://dexscreener.com/solana/{token_address}
- GMGN Link: https://gmgn.ai/sol/token/x9jrJfiB_{token_address}
- Trojan Link: https://t.me/solana_trojanbot?start=r-soldeckadmin-{token_address}
- Banana Link: https://t.me/BananaGunSniper_bot?start=ref_soldeck_{token_address}
- Ape Link: https://ape.pro/solana/{token_address}/?ref=r1BYVsxdhZGY

Analyze the following transcript and, if it contains a clear trade command or a request to open a site, respond with exactly one JSON object (and nothing else) that follows this schema:
{
  "action": "<trade or open>",
  "site": "<pump | bullx | neo | photon | dexscreener | gmgn | trojan | banana | ape>",
  "tradeType": "<buy or sell, if action is trade>",
  "amount": "<amount if applicable, as a string>",
  "token": "<token address if applicable>"
}
If no valid instruction is determined, respond with an empty string.

Transcript:
\`\`\`
${transcript}
\`\`\`
        `;

        const chatBody = {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: transcript }
          ],
          temperature: 0.2
        };

        console.log("Sending transcript to ChatGPT...");
        const chatResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(chatBody)
        });
        if (!chatResp.ok) {
          const errMsg = await chatResp.text();
          throw new Error(errMsg);
        }
        const chatJson = await chatResp.json();
        console.log("Full ChatGPT JSON response:", JSON.stringify(chatJson, null, 2));
        const reply = chatJson.choices[0].message.content.trim();
        console.log("Raw ChatGPT reply:", reply);

        // Copy the raw reply to the clipboard for diagnosis.
        try {
          await navigator.clipboard.writeText(reply);
          console.log("ChatGPT reply copied to clipboard.");
        } catch (err) {
          console.warn("Failed to copy ChatGPT reply to clipboard:", err);
        }

        if (!reply) {
          console.warn("ChatGPT returned an empty string.");
          return;
        }

        let command;
        try {
          command = JSON.parse(reply);
          console.log("Parsed command:", command);
        } catch (e) {
          console.warn("Failed to parse JSON from ChatGPT reply:", e);
          command = null;
        }
        if (command) {
          executeTradeCommand(command);
        } else {
          console.log("No valid trade/open instruction was returned.");
        }
      } catch (error) {
        console.error("Error during transcription or chat processing:", error);
        alert("Error: " + error.message);
      }
    });
  }

  // --- Create and inject the circular voice button ---
  function injectVoiceButton() {
    removeVoiceButton();
    console.log("Injecting voice button...");
    const voiceButton = document.createElement("button");
    voiceButton.id = VOICE_BUTTON_ID;
    voiceButton.innerText = "AI";
    Object.assign(voiceButton.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 9999,
      width: "50px",
      height: "50px",
      background: "#15171a",
      border: "1px solid silver",
      color: "#b9babb",
      borderRadius: "50%",
      cursor: "pointer",
      fontSize: "16px",
      lineHeight: "50px",
      textAlign: "center",
      userSelect: "none",
      outline: "none"
    });
    document.body.appendChild(voiceButton);
    console.log("Voice button injected.");

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        isRecording = true;
        mediaRecorder.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0) audioChunks.push(event.data);
        });
        mediaRecorder.addEventListener("stop", () => {
          isRecording = false;
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          processAudio(audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        });
        mediaRecorder.start();
        console.log("Recording started.");
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Error accessing microphone: " + err.message);
      }
    }

    function stopRecording() {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        console.log("Recording stopped.");
      }
    }

    // --- "Tap and hold" event listeners for button ---
    voiceButton.addEventListener("mousedown", () => {
      voiceButton.style.backgroundColor = "#3367D6";
      startRecording();
    });
    voiceButton.addEventListener("touchstart", (e) => {
      e.preventDefault();
      voiceButton.style.backgroundColor = "#3367D6";
      startRecording();
    });
    voiceButton.addEventListener("mouseup", () => {
      voiceButton.style.backgroundColor = "#15171a";
      stopRecording();
    });
    voiceButton.addEventListener("mouseleave", () => {
      voiceButton.style.backgroundColor = "#15171a";
      stopRecording();
    });
    voiceButton.addEventListener("touchend", () => {
      voiceButton.style.backgroundColor = "#15171a";
      stopRecording();
    });
  }

  // --- Keybind functionality ---
  // Load the user-defined keybind from settings (default "F8")
  chrome.storage.sync.get("speechKeybind", (data) => {
    const key = data.speechKeybind || "F8";
    console.log("Loaded speech keybind:", key);

    if (key.startsWith("MOUSE")) {
      // Allow mouse keybinds. Expect the key to be in the format "MOUSE0", "MOUSE1", etc.
      const mouseButton = parseInt(key.replace("MOUSE", ""), 10);
      window.addEventListener("mousedown", (e) => {
        if (e.button === mouseButton && !isRecording) {
          console.log("Mouse keybind pressed:", key);
          e.preventDefault();
          startRecording();
        }
      });
      window.addEventListener("mouseup", (e) => {
        if (e.button === mouseButton && isRecording) {
          console.log("Mouse keybind released:", key);
          stopRecording();
        }
      });
    } else {
      window.addEventListener("keydown", (e) => {
        if (e.key === key && !isRecording) {
          console.log("Keybind pressed:", key);
          e.preventDefault();
          startRecording();
        }
      });

      window.addEventListener("keyup", (e) => {
        if (e.key === key && isRecording) {
          console.log("Keybind released:", key);
          stopRecording();
        }
      });
    }
  });

  // --- Inject the voice button on initial load ---
  injectVoiceButton();

  // --- Debounce and observer for dynamic changes (unchanged) ---
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  const debouncedUpdate = debounce(() => {
    const newToken = getTokenContractAddress();
    if (newToken && newToken !== currentContractAddress) {
      currentContractAddress = newToken;
      injectVoiceButton(newToken);
    }
  }, 500);
  const observer = new MutationObserver(debouncedUpdate);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", debouncedUpdate);

  // --- Function from original for token extraction in keybind context ---
  function getTokenContractAddress() {
    const hostname = location.hostname;
    let tAddress = null;
    if (hostname.includes("gmgn.ai")) {
      const solscanAnchor = document.querySelector('a[href^="https://solscan.io/token/"]');
      if (solscanAnchor) {
        tAddress = new URL(solscanAnchor.href).pathname.replace("/token/", "");
      } else {
        console.log("voice.js: No Solscan token link found on gmgn.ai page.");
      }
    } else if (hostname.includes("neo.bullx.io")) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has("address")) {
        tAddress = urlParams.get("address");
      } else {
        console.log("voice.js: No 'address' parameter found in neo.bullx.io URL.");
      }
    } else if (hostname.includes("photon-sol.tinyastro.io")) {
      const parts = location.pathname.split("/");
      tAddress = parts[parts.length - 1] || null;
    } else if (hostname.includes("dexscreener.com")) {
      const solscanAnchor = document.querySelector('a[href^="https://solscan.io/token/"]');
      if (solscanAnchor) {
        tAddress = solscanAnchor.href.replace("https://solscan.io/token/", "");
      } else {
        console.log("voice.js: No Solscan token link found on dexscreener page.");
      }
    }
    return tAddress;
  }
})();
