/**
 * FLAMES — Relationship Oracle  |  script.js
 * Pure vanilla JS — no frameworks, no dependencies.
 *
 * Sections:
 *  1. DOM references
 *  2. FLAMES data (meanings, colours, emojis)
 *  3. FLAMES algorithm
 *  4. UI state machine
 *  5. Wheel animation
 *  6. Typing animation
 *  7. Confetti & hearts
 *  8. Particle background (canvas)
 *  9. Action buttons (copy / share / reset)
 * 10. Event listeners & boot
 */

"use strict";

/* ════════════════════════════════════════════════════
   1. DOM REFERENCES
   ════════════════════════════════════════════════════ */
const inputSection   = document.getElementById("input-section");
const wheelSection   = document.getElementById("wheel-section");
const resultSection  = document.getElementById("result-section");
const flamesLegend   = document.getElementById("flames-legend");

const name1Input     = document.getElementById("name1");
const name2Input     = document.getElementById("name2");
const calcBtn        = document.getElementById("calc-btn");
const errorMsg       = document.getElementById("error-msg");

const wheelFace      = document.getElementById("wheel-face");
const loadingLabel   = document.getElementById("loading-label");

const resultEmoji    = document.getElementById("result-emoji");
const resultTitle    = document.getElementById("result-title");
const resultDesc     = document.getElementById("result-desc");
const dispName1      = document.getElementById("disp-name1");
const dispName2      = document.getElementById("disp-name2");

const copyBtn        = document.getElementById("copy-btn");
const shareBtn       = document.getElementById("share-btn");
const resetBtn       = document.getElementById("reset-btn");

const confettiCtr    = document.getElementById("confetti-container");
const bgCanvas       = document.getElementById("bg-canvas");
const bgCtx          = bgCanvas.getContext("2d");


/* ════════════════════════════════════════════════════
   2. FLAMES DATA
   ════════════════════════════════════════════════════ */
const FLAMES_DATA = {
  F: {
    label:  "Friends",
    emoji:  "🤝",
    desc:   "You two are destined to be the best of friends — a bond built on trust, laughter, and endless memories.",
    confetti: false,
    color:  "#00e5ff",
  },
  L: {
    label:  "Love",
    emoji:  "❤️",
    desc:   "Sparks are flying! The universe sees deep romantic potential between you two.",
    confetti: true,
    color:  "#ff4fa3",
  },
  A: {
    label:  "Affection",
    emoji:  "🥰",
    desc:   "A warm, caring connection — full of sweet moments and genuine fondness for each other.",
    confetti: true,
    color:  "#c850ff",
  },
  M: {
    label:  "Marriage",
    emoji:  "💍",
    desc:   "The stars align for a lifetime together. This could be the one you've been waiting for!",
    confetti: true,
    color:  "#ffd166",
  },
  E: {
    label:  "Enemies",
    emoji:  "😈",
    desc:   "Clash of titans! There's friction between you two — but hey, enemies make the best rivals.",
    confetti: false,
    color:  "#ff5f7e",
  },
  S: {
    label:  "Siblings",
    emoji:  "👨‍👩‍👧‍👦",
    desc:   "You're like family — bickering one moment, having each other's back the next. A sibling-like bond.",
    confetti: false,
    color:  "#06d6a0",
  },
};

const FLAMES_ORDER = ["F", "L", "A", "M", "E", "S"];

const LOADING_MSGS = [
  "Reading the stars…",
  "Consulting the oracle…",
  "Counting the letters…",
  "Weaving your fates…",
  "Almost there…",
];


/* ════════════════════════════════════════════════════
   3. FLAMES ALGORITHM
   ════════════════════════════════════════════════════ */
/**
 * Classic FLAMES algorithm:
 *  - Remove common letters (case-insensitive, spaces ignored).
 *  - Count remaining letters = n.
 *  - Cycle through FLAMES array, eliminating every n-th remaining letter.
 *  - Last letter standing is the result.
 */
function calculateFLAMES(nameA, nameB) {
  // Sanitise: lowercase, letters only
  const clean = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
  let a = clean(nameA).split("");
  let b = clean(nameB).split("");

  // Remove common letters
  for (let i = 0; i < a.length; i++) {
    const idx = b.indexOf(a[i]);
    if (idx !== -1) {
      a[i] = null;
      b[idx] = null;
    }
  }

  const remaining = [...a, ...b].filter(Boolean);
  const count = remaining.length;

  // Edge-case: all letters cancel
  if (count === 0) return "L";  // default to Love

  // Eliminate from FLAMES array
  let flames = [...FLAMES_ORDER];
  let pointer = 0;

  while (flames.length > 1) {
    pointer = (pointer + count - 1) % flames.length;
    flames.splice(pointer, 1);
    if (pointer >= flames.length) pointer = 0;
  }

  return flames[0];
}


/* ════════════════════════════════════════════════════
   4. UI STATE MACHINE
   Show / hide the three main sections.
   States: "input" | "wheel" | "result"
   ════════════════════════════════════════════════════ */
function showSection(name) {
  [inputSection, wheelSection, resultSection].forEach((el) =>
    el.classList.add("hidden")
  );
  if (name === "input") {
    inputSection.classList.remove("hidden");
    inputSection.classList.add("fade-in");
  } else if (name === "wheel") {
    wheelSection.classList.remove("hidden");
    wheelSection.classList.add("fade-in");
  } else if (name === "result") {
    resultSection.classList.remove("hidden");
    resultSection.classList.add("fade-in");
  }
}

/* Validate the two name inputs. Returns error string or null. */
function validate(n1, n2) {
  if (!n1.trim()) return "Please enter your name.";
  if (!n2.trim()) return "Please enter their name.";
  if (n1.trim().toLowerCase() === n2.trim().toLowerCase())
    return "Enter two different names!";
  if (n1.trim().length < 2 || n2.trim().length < 2)
    return "Each name must be at least 2 characters.";
  return null;
}


/* ════════════════════════════════════════════════════
   5. WHEEL ANIMATION
   Highlights each FLAMES letter in sequence, then
   eliminates letters one by one until the result is lit.
   ════════════════════════════════════════════════════ */
function runWheelAnimation(result, onComplete) {
  const letters = wheelFace.querySelectorAll(".wheel-letter");
  let msgIdx = 0;

  // Cycle loading messages
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % LOADING_MSGS.length;
    loadingLabel.textContent = LOADING_MSGS[msgIdx];
  }, 800);

  // Rapid spin phase: flash through all letters quickly
  let spinCount  = 0;
  const spinMax  = 18;         // number of rapid flashes
  let spinCursor = 0;

  const spinPhase = setInterval(() => {
    letters.forEach((l) => l.classList.remove("active"));
    letters[spinCursor % letters.length].classList.add("active");
    spinCursor++;
    spinCount++;

    if (spinCount >= spinMax) {
      clearInterval(spinPhase);
      // Start the elimination phase
      setTimeout(() => eliminationPhase(), 300);
    }
  }, 80);

  // Elimination phase: mirrors the algorithm visually
  function eliminationPhase() {
    // Re-compute which letters get eliminated and in what order
    let flames = [...FLAMES_ORDER];  // ["F","L","A","M","E","S"]
    const name1Val = name1Input.value;
    const name2Val = name2Input.value;
    const clean = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
    let a = clean(name1Val).split("");
    let b = clean(name2Val).split("");
    for (let i = 0; i < a.length; i++) {
      const idx = b.indexOf(a[i]);
      if (idx !== -1) { a[i] = null; b[idx] = null; }
    }
    const count = [...a, ...b].filter(Boolean).length || 1;

    const eliminationOrder = [];
    let temp = [...FLAMES_ORDER];
    let ptr  = 0;
    while (temp.length > 1) {
      ptr = (ptr + count - 1) % temp.length;
      eliminationOrder.push(temp[ptr]);
      temp.splice(ptr, 1);
      if (ptr >= temp.length) ptr = 0;
    }

    // Animate eliminations sequentially
    let step = 0;
    function nextElim() {
      if (step >= eliminationOrder.length) {
        // Final: light up the winner
        letters.forEach((l) => l.classList.remove("active"));
        const winner = wheelFace.querySelector(`[data-l="${result}"]`);
        if (winner) {
          winner.classList.remove("eliminated");
          winner.classList.add("active");
        }
        clearInterval(msgInterval);
        loadingLabel.textContent = "The oracle has spoken ✨";
        setTimeout(onComplete, 900);
        return;
      }
      const ltr = eliminationOrder[step];
      const el  = wheelFace.querySelector(`[data-l="${ltr}"]`);
      if (el) el.classList.add("eliminated");
      step++;
      setTimeout(nextElim, 320);
    }
    setTimeout(nextElim, 200);
  }
}

/** Reset wheel state for reuse */
function resetWheel() {
  wheelFace.querySelectorAll(".wheel-letter").forEach((l) => {
    l.classList.remove("active", "eliminated");
  });
  loadingLabel.textContent = LOADING_MSGS[0];
}


/* ════════════════════════════════════════════════════
   6. TYPING ANIMATION
   Renders text one character at a time.
   ════════════════════════════════════════════════════ */
function typeText(element, text, speed = 55, onDone) {
  element.classList.add("cursor-blink");
  element.textContent = "";
  let i = 0;
  const iv = setInterval(() => {
    element.textContent += text[i];
    i++;
    if (i >= text.length) {
      clearInterval(iv);
      element.classList.remove("cursor-blink");
      if (onDone) onDone();
    }
  }, speed);
}


/* ════════════════════════════════════════════════════
   7. CONFETTI & FLOATING HEARTS
   ════════════════════════════════════════════════════ */
const CONFETTI_COLORS = [
  "#c850ff", "#ff4fa3", "#00e5ff", "#ffd166",
  "#06d6a0", "#ffffff", "#ffb3e6", "#b3ffec",
];

function spawnConfetti(count = 120) {
  confettiCtr.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const size  = 6 + Math.random() * 8;
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${Math.random() > .5 ? "50%" : "2px"};
      animation-duration: ${2.4 + Math.random() * 2.2}s;
      animation-delay: ${Math.random() * 1.2}s;
    `;
    confettiCtr.appendChild(piece);
  }
  // Clear after animations finish
  setTimeout(() => { confettiCtr.innerHTML = ""; }, 5000);
}

function spawnHearts() {
  const EMOJIS = ["❤️", "💖", "💕", "✨", "💫", "🌟"];
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const h = document.createElement("span");
      h.className = "float-heart";
      h.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      h.style.cssText = `
        left: ${10 + Math.random() * 80}%;
        bottom: ${5 + Math.random() * 20}%;
        font-size: ${1 + Math.random() * 1.2}rem;
        animation-duration: ${3 + Math.random() * 2}s;
        animation-delay: ${Math.random() * .6}s;
      `;
      document.body.appendChild(h);
      h.addEventListener("animationend", () => h.remove());
    }, i * 140);
  }
}


/* ════════════════════════════════════════════════════
   8. PARTICLE BACKGROUND (canvas)
   ════════════════════════════════════════════════════ */
let particles = [];
let animFrame;

function resizeCanvas() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}

function initParticles() {
  particles = [];
  const count = Math.min(60, Math.floor((bgCanvas.width * bgCanvas.height) / 18000));
  for (let i = 0; i < count; i++) {
    particles.push({
      x:   Math.random() * bgCanvas.width,
      y:   Math.random() * bgCanvas.height,
      r:   0.6 + Math.random() * 1.4,
      dx:  (Math.random() - .5) * 0.35,
      dy:  (Math.random() - .5) * 0.35,
      o:   0.2 + Math.random() * 0.5,
    });
  }
}

function drawParticles() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  particles.forEach((p) => {
    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(200,80,255,${p.o})`;
    bgCtx.fill();

    // Move
    p.x += p.dx;
    p.y += p.dy;

    // Wrap
    if (p.x < 0) p.x = bgCanvas.width;
    if (p.x > bgCanvas.width) p.x = 0;
    if (p.y < 0) p.y = bgCanvas.height;
    if (p.y > bgCanvas.height) p.y = 0;
  });
  animFrame = requestAnimationFrame(drawParticles);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  initParticles();
});

resizeCanvas();
initParticles();
drawParticles();


/* ════════════════════════════════════════════════════
   9. ACTION BUTTONS
   ════════════════════════════════════════════════════ */

/** Current result state — stored for copy / share actions */
let currentResult = null;

copyBtn.addEventListener("click", () => {
  if (!currentResult) return;
  const text = buildShareText(currentResult, name1Input.value, name2Input.value);
  navigator.clipboard.writeText(text)
    .then(() => flashBtn(copyBtn, "✅ Copied!"))
    .catch(() => flashBtn(copyBtn, "⚠️ Failed"));
});

shareBtn.addEventListener("click", () => {
  if (!currentResult) return;
  const text = buildShareText(currentResult, name1Input.value, name2Input.value);
  if (navigator.share) {
    navigator.share({ title: "FLAMES Result", text }).catch(() => {});
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text)
      .then(() => flashBtn(shareBtn, "📋 Copied link!"))
      .catch(() => {});
  }
});

resetBtn.addEventListener("click", () => {
  currentResult = null;
  name1Input.value = "";
  name2Input.value = "";
  errorMsg.textContent = "";

  // Remove legend highlights
  flamesLegend.querySelectorAll("li").forEach((li) =>
    li.classList.remove("highlight")
  );

  resetWheel();
  showSection("input");
  name1Input.focus();
});

function buildShareText(resultKey, n1, n2) {
  const d = FLAMES_DATA[resultKey];
  return `🔮 FLAMES says: ${n1.trim()} & ${n2.trim()} are — ${d.emoji} ${d.label}!\n"${d.desc}"\n\nTry FLAMES: https://flames-oracle.vercel.app`;
}

function flashBtn(btn, label) {
  const original = btn.innerHTML;
  btn.innerHTML = label;
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = original;
    btn.disabled = false;
  }, 1800);
}


/* ════════════════════════════════════════════════════
   10. MAIN FLOW + EVENT LISTENERS
   ════════════════════════════════════════════════════ */
function startCalculation() {
  const n1 = name1Input.value;
  const n2 = name2Input.value;

  // Validate
  const err = validate(n1, n2);
  if (err) {
    errorMsg.textContent = err;
    // Shake the button
    calcBtn.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-8px)" },
        { transform: "translateX(8px)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 380, easing: "ease-in-out" }
    );
    return;
  }
  errorMsg.textContent = "";

  // Compute result (before animation so we know the answer)
  const result = calculateFLAMES(n1, n2);
  currentResult = result;

  // Show wheel section
  resetWheel();
  showSection("wheel");

  // Run animated wheel
  runWheelAnimation(result, () => {
    // Transition to result card
    populateResult(result, n1, n2);
    showSection("result");

    // Highlight the matching legend item
    flamesLegend.querySelectorAll("li").forEach((li) => {
      li.classList.toggle("highlight", li.dataset.l === result);
    });

    // Confetti / hearts for positive results
    if (FLAMES_DATA[result].confetti) {
      spawnConfetti();
      spawnHearts();
    }
  });
}

function populateResult(result, n1, n2) {
  const data = FLAMES_DATA[result];

  // Emoji
  resultEmoji.textContent = data.emoji;

  // Title — typed out
  resultTitle.textContent = "";
  typeText(resultTitle, data.label, 70, () => {
    // Description fades in after title finishes
    resultDesc.style.opacity = "0";
    resultDesc.textContent = data.desc;
    resultDesc.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], {
      duration: 500, easing: "ease-out", fill: "forwards",
    });
  });

  // Names
  dispName1.textContent = n1.trim();
  dispName2.textContent = n2.trim();

  // Tint the result card border with the result colour
  resultSection.style.borderColor = data.color + "55";
  resultSection.style.boxShadow   = `0 24px 64px rgba(0,0,0,0.55), 0 0 40px ${data.color}22`;
}

// Trigger calculation on button click
calcBtn.addEventListener("click", startCalculation);

// Allow Enter key on either input field
[name1Input, name2Input].forEach((inp) => {
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") startCalculation();
  });
  // Clear error on typing
  inp.addEventListener("input", () => {
    errorMsg.textContent = "";
  });
});

// Start on input section
showSection("input");
