document.addEventListener("DOMContentLoaded", () => {
  const pumpOpt = document.getElementById("pump-option");
  const bullxOpt = document.getElementById("bullx-option");
  const neoBullxOpt = document.getElementById("neo-bullx-option");
  const photonOpt = document.getElementById("photon-option");
  const dexsOpt = document.getElementById("dexs-option");
  const gmgnOpt = document.getElementById("gmgn-option");
  const trojanOpt = document.getElementById("trojan-option");
  const apeOpt = document.getElementById("ape-option");

  const saveBtn = document.getElementById("save-btn");
  const statusEl = document.getElementById("status");

  // Load settings on page load
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

  // Save settings on "Save" click
  saveBtn.addEventListener("click", () => {
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
      statusEl.textContent = "Settings saved!";
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    });
  });
});
