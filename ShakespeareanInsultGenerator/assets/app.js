// Word banks are intentionally large to maximize variation and avoid repetition fatigue.
const wordBanks = {
  firstAdj: [
    "artless", "bawdy", "beslubbering", "bootless", "churlish", "cockered", "craven", "currish", "dankish", "dissembling",
    "droning", "errant", "fawning", "fobbing", "frothy", "gleeking", "goatish", "gorbellied", "impertinent", "infectious",
    "jarring", "loggerheaded", "lumpish", "mammering", "mangled", "paunchy", "pribbling", "puking", "puny", "qualling",
    "rank", "reeky", "roguish", "ruttish", "saucy", "spleeny", "spongy", "surly", "tottering", "unmuzzled",
    "vain", "venomed", "villainous", "warped", "wayward", "weedy", "yeasty", "clouted", "muddy", "crooked",
    "witless", "sniveling", "blighted", "graceless", "heedless", "pestilent", "grubby", "malodorous", "knotted", "brutish"
  ],
  secondAdj: [
    "base-court", "bat-fowling", "beef-witted", "beetle-headed", "boil-brained", "clapper-clawed", "clay-brained", "common-kissing", "crook-pated", "dismal-dreaming",
    "dizzy-eyed", "doghearted", "dread-bolted", "earth-vexing", "elf-skinned", "fat-kidneyed", "fen-sucked", "flap-mouthed", "fly-bitten", "folly-fallen",
    "fool-born", "full-gorged", "guts-griping", "half-faced", "hasty-witted", "hedge-born", "hell-hated", "idle-headed", "ill-breeding", "ill-nurtured",
    "knotty-pated", "milk-livered", "motley-minded", "onion-eyed", "plume-plucked", "pottle-deep", "pox-marked", "reeling-ripe", "rough-hewn", "rump-fed",
    "shard-borne", "sheep-biting", "spur-galled", "swag-bellied", "tardy-gaited", "tickle-brained", "toad-spotted", "unchin-snouted", "weather-bitten", "woeful-featured",
    "worm-eaten", "hag-seeded", "rag-clad", "wince-faced", "scarred-browed", "thin-lipped", "hog-nurtured", "storm-beaten", "ale-soaked", "grime-handed"
  ],
  nouns: [
    "apple-john", "baggage", "barnacle", "bladder", "boar-pig", "bugbear", "bum-bailey", "canker-blossom", "clack-dish", "clotpole",
    "coxcomb", "codpiece", "death-token", "dewberry", "flax-wench", "flirt-gill", "foot-licker", "fustilarian", "giglet", "gudgeon",
    "haggard", "harpy", "hedge-pig", "horn-beast", "hugger-mugger", "joithead", "knave", "lewdster", "lout", "maggot-pie",
    "malt-worm", "mammet", "measle", "minnow", "miscreant", "moldwarp", "mumble-news", "nut-hook", "pigeon-egg", "pignut",
    "puttock", "pumpion", "ratsbane", "scullion", "skainsmate", "strumpet", "varlot", "vassal", "wagtail", "whey-face",
    "younker", "zedless toad", "ruffian", "jackanape", "moon-calf", "dunghill", "doxy", "codling", "rascal", "muckworm"
  ]
};

const insultBox = document.getElementById("insultBox");
const historyList = document.getElementById("historyList");
const messageEl = document.getElementById("message");
const countEl = document.getElementById("count");
const modeSelect = document.getElementById("modeSelect");

let generatedCount = 0;
let lastInsult = "";
const history = [];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

function sentenceForMode(a1, a2, noun, mode) {
  if (mode === "dramatic") {
    return `Thou ${a1}, ${a2} ${noun}, thy presence doth offend mine eyes!`;
  }
  if (mode === "royal") {
    return `By royal decree, thou art a ${a1}, ${a2} ${noun}!`;
  }
  return `Thou art a ${a1}, ${a2} ${noun}!`;
}

// Prevent immediate duplicate output by retrying random picks a few times.
function generateInsult(mode = modeSelect.value) {
  let candidate = "";
  let attempts = 0;
  do {
    const a1 = randomItem(wordBanks.firstAdj);
    const a2 = randomItem(wordBanks.secondAdj);
    const noun = randomItem(wordBanks.nouns);
    candidate = sentenceForMode(a1, a2, noun, mode);
    attempts += 1;
  } while (candidate === lastInsult && attempts < 30);

  lastInsult = candidate;
  return candidate;
}

function setDisplay(text, asList = false) {
  insultBox.classList.remove("fade-in");
  void insultBox.offsetWidth;
  insultBox.classList.add("fade-in");

  if (asList) {
    insultBox.innerHTML = text.map((line, index) => `${index + 1}. ${line}`).join("<br>");
  } else {
    insultBox.textContent = text;
  }
}

function addToHistory(insult) {
  history.unshift(insult);
  if (history.length > 10) {
    history.pop();
  }
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";
  for (const line of history) {
    const li = document.createElement("li");
    li.textContent = line;
    historyList.appendChild(li);
  }
}

function incrementCount(amount = 1) {
  generatedCount += amount;
  countEl.textContent = String(generatedCount);
}

function showMessage(text, ms = 1400) {
  messageEl.textContent = text;
  window.setTimeout(() => {
    if (messageEl.textContent === text) {
      messageEl.textContent = "";
    }
  }, ms);
}

async function copyCurrentInsult() {
  const plain = insultBox.innerText.trim();
  if (!plain || plain.startsWith("Press Generate Insult")) {
    showMessage("Generate an insult first.");
    return;
  }

  try {
    await navigator.clipboard.writeText(plain);
    showMessage("Insult copied to clipboard.");
  } catch {
    showMessage("Clipboard unavailable in this browser.");
  }
}

function speakCurrentInsult() {
  const text = insultBox.innerText.trim();
  if (!text || text.startsWith("Press Generate Insult")) {
    showMessage("Generate an insult first.");
    return;
  }
  if (!("speechSynthesis" in window)) {
    showMessage("Speech Synthesis is not supported.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find((voice) => /en-GB/i.test(voice.lang)) || voices.find((voice) => /English/i.test(voice.name));
  if (preferred) {
    utterance.voice = preferred;
  }
  utterance.rate = 0.9;
  utterance.pitch = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function tweetCurrentInsult() {
  const text = insultBox.innerText.trim();
  if (!text || text.startsWith("Press Generate Insult")) {
    showMessage("Generate an insult first.");
    return;
  }
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + " #ShakespeareanInsult")}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function handleGenerateOne() {
  const insult = generateInsult();
  setDisplay(insult);
  addToHistory(insult);
  incrementCount(1);
}

function handleGenerateTen() {
  const lines = [];
  const localSet = new Set();
  while (lines.length < 10) {
    const next = generateInsult();
    if (!localSet.has(next)) {
      localSet.add(next);
      lines.push(next);
      addToHistory(next);
    }
  }
  setDisplay(lines, true);
  incrementCount(10);
}

function clearHistory() {
  history.length = 0;
  renderHistory();
  showMessage("History cleared.");
}

document.getElementById("generateBtn").addEventListener("click", handleGenerateOne);
document.getElementById("copyBtn").addEventListener("click", copyCurrentInsult);
document.getElementById("generateTenBtn").addEventListener("click", handleGenerateTen);
document.getElementById("clearHistoryBtn").addEventListener("click", clearHistory);
document.getElementById("tweetBtn").addEventListener("click", tweetCurrentInsult);
document.getElementById("speakBtn").addEventListener("click", speakCurrentInsult);

// Some browsers load voices asynchronously, so this helps ensure better voice selection.
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => {};
}
