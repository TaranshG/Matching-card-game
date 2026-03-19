/**
 * File: js/App.js
 * Author: CS1XD3 Student
 * Description: Main controller for Memory Match!
 *              Connects the GameModel (state), DOM elements (view),
 *              SoundManager, SplashAnimation, and localStorage history.
 *
 *              Implements 5 rounds of increasing pair counts:
 *                Round 1: 4 pairs  (4x2 grid)
 *                Round 2: 6 pairs  (4x3 grid)
 *                Round 3: 6 pairs  (4x3 grid)
 *                Round 4: 8 pairs  (4x4 grid)
 *                Round 5: 8 pairs  (4x4 grid)
 *
 *              Model/View separation:
 *                - All game state lives in GameModel and the session
 *                  variables below. The DOM is written to but never
 *                  read from to retrieve state.
 *
 *              All event listeners use addEventListener inside the
 *              window 'load' handler.
 * Date: 2026
 */

"use strict";

window.addEventListener("load", () => {

  // ═══════════════════════════════════════
  //  CONSTANTS
  // ═══════════════════════════════════════

  /** @const {string}  localStorage key. */
  const STORAGE_KEY   = "memory_match_history";

  /** @const {number}  Max history entries stored. */
  const MAX_HISTORY   = 10;

  /** @const {number}  Total rounds per game. */
  const TOTAL_ROUNDS  = 5;

  /**
   * @const {number[]}  Pair counts for each round (1-indexed).
   *   Round 1 → 4 pairs, rounds 4–5 → 8 pairs.
   */
  const PAIRS_PER_ROUND = [0, 4, 6, 6, 8, 8];  // index 0 unused

  /**
   * @const {number[]}  Grid column counts matching PAIRS_PER_ROUND.
   *   4 pairs → 4 cols (4×2), 6 pairs → 4 cols (4×3), 8 pairs → 4 cols (4×4).
   */
  const COLS_PER_ROUND  = [0, 4, 4, 4, 4, 4];

  // ═══════════════════════════════════════
  //  SESSION STATE
  // ═══════════════════════════════════════

  /** @type {GameModel|null}  Active round model. */
  let model = null;

  /** @type {number}  Current round (1-indexed). */
  let currentRound = 1;

  /** @type {number}  Cumulative flips across all completed rounds. */
  let totalFlips = 0;

  /** @type {number}  Total seconds across all completed rounds. */
  let totalSeconds = 0;

  /**
   * @type {Array<{round:number, flips:number, seconds:number}>}
   * Per-round breakdown collected as rounds finish.
   */
  let roundResults = [];

  /** @type {number}  setInterval handle for the live timer. */
  let timerInterval = null;

  /** @type {number}  Seconds elapsed in the current round. */
  let roundSeconds = 0;

  // ═══════════════════════════════════════
  //  SOUND
  // ═══════════════════════════════════════

  /** @type {SoundManager} */
  const sound = new SoundManager();

  // ═══════════════════════════════════════
  //  DOM REFERENCES
  // ═══════════════════════════════════════

  const splashScreen   = document.getElementById("splash-screen");
  const splashCanvas   = document.getElementById("splash-canvas");
  const startBtn       = document.getElementById("start-btn");

  const app            = document.getElementById("app");
  const helpBtn        = document.getElementById("help-btn");
  const helpOverlay    = document.getElementById("help-overlay");
  const closeHelpBtn   = document.getElementById("close-help-btn");
  const restartBtn     = document.getElementById("restart-btn");

  const roundText      = document.getElementById("round-text");
  const roundPips      = document.getElementById("round-pips");
  const flipCount      = document.getElementById("flip-count");
  const matchCount     = document.getElementById("match-count");
  const timerDisplay   = document.getElementById("timer-display");
  const bestDisplay    = document.getElementById("best-display");
  const progressFill   = document.getElementById("progress-fill");
  const board          = document.getElementById("board");

  const resultScreen   = document.getElementById("result-screen");
  const resultStats    = document.getElementById("result-stats");
  const resultBest     = document.getElementById("result-best");
  const breakdownBody  = document.getElementById("breakdown-body");
  const historyList    = document.getElementById("history-list");
  const playAgainBtn   = document.getElementById("play-again-btn");

  // ═══════════════════════════════════════
  //  SPLASH
  // ═══════════════════════════════════════

  const splash = new SplashAnimation(splashCanvas, startBtn, () => {
    splashScreen.classList.add("fade-out");
    setTimeout(() => {
      splashScreen.classList.add("hidden");
      app.classList.remove("hidden");
      _startSession();
    }, 500);
  });

  // ═══════════════════════════════════════
  //  LOCAL STORAGE HELPERS
  // ═══════════════════════════════════════

  /**
   * Loads game history from localStorage.
   * @returns {Array<{date:string, flips:number, seconds:number}>}
   */
  function _loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (_e) {
      return [];
    }
  }

  /**
   * Saves a completed session result to localStorage.
   * @param {number} flips   - Total flips for the session.
   * @param {number} seconds - Total seconds for the session.
   */
  function _saveResult(flips, seconds) {
    const history = _loadHistory();
    const now     = new Date();
    const date    = `${now.getMonth() + 1}/${now.getDate()} `
                  + `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    history.unshift({ date, flips, seconds });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  /**
   * Returns the best (lowest) flip total from history, or null.
   * @returns {number|null}
   */
  function _getBest() {
    const h = _loadHistory();
    if (h.length === 0) return null;
    return Math.min(...h.map(e => e.flips));
  }

  // ═══════════════════════════════════════
  //  TIMER HELPERS
  // ═══════════════════════════════════════

  /** Starts the per-round timer. */
  function _startTimer() {
    _stopTimer();
    roundSeconds  = 0;
    timerInterval = setInterval(() => {
      roundSeconds++;
      timerDisplay.textContent = _fmt(roundSeconds);
    }, 1000);
  }

  /** Stops the timer. */
  function _stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  /**
   * Formats seconds as "m:ss".
   * @param {number} s
   * @returns {string}
   */
  function _fmt(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // ═══════════════════════════════════════
  //  VIEW RENDERERS  (DOM writes only)
  // ═══════════════════════════════════════

  /**
   * Builds the five round pip dots in the round banner.
   */
  function _renderPips() {
    roundPips.innerHTML = "";
    for (let i = 1; i <= TOTAL_ROUNDS; i++) {
      const pip = document.createElement("span");
      pip.classList.add("pip");
      if (i < currentRound)        pip.classList.add("done");
      else if (i === currentRound) pip.classList.add("active");
      roundPips.appendChild(pip);
    }
  }

  /**
   * Renders the board from model state.
   * Creates one .card div per Card object and attaches click handlers.
   */
  function _renderBoard() {
    const cols = COLS_PER_ROUND[currentRound];
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    board.innerHTML = "";

    model.getCards().forEach((card, idx) => {
      // Outer flip container
      const div = document.createElement("div");
      div.classList.add("card");
      if (card.faceUp)  div.classList.add("flipped");
      if (card.matched) div.classList.add("matched");

      // Inner rotating element
      const inner = document.createElement("div");
      inner.classList.add("card-inner");

      // Back face (shown when face-down)
      const back = document.createElement("div");
      back.classList.add("card-back");

      // Front face (shown when flipped)
      const front = document.createElement("div");
      front.classList.add("card-front");
      front.textContent = card.emoji;

      inner.appendChild(back);
      inner.appendChild(front);
      div.appendChild(inner);

      // Only attach click if not matched
      if (!card.matched) {
        div.addEventListener("click", () => _handleCardClick(idx));
      }

      board.appendChild(div);
    });
  }

  /**
   * Updates the stats bar and progress bar from model state.
   */
  function _renderStats() {
    flipCount.textContent  = model.getFlips();
    matchCount.textContent = `${model.getMatches()}/${PAIRS_PER_ROUND[currentRound]}`;
    progressFill.style.width = model.getProgress() + "%";

    const best = _getBest();
    bestDisplay.textContent = best !== null ? best : "--";
  }

  /**
   * Updates the round label text.
   */
  function _renderRoundLabel() {
    roundText.textContent = `Round ${currentRound} of ${TOTAL_ROUNDS}`;
  }

  // ═══════════════════════════════════════
  //  GAME FLOW
  // ═══════════════════════════════════════

  /**
   * Starts a completely fresh game session.
   */
  function _startSession() {
    currentRound  = 1;
    totalFlips    = 0;
    totalSeconds  = 0;
    roundResults  = [];
    resultScreen.classList.add("hidden");
    _startRound();
  }

  /**
   * Sets up one round: creates a new model, renders the board, starts timer.
   */
  function _startRound() {
    model = new GameModel(PAIRS_PER_ROUND[currentRound]);
    _stopTimer();
    _startTimer();
    _renderRoundLabel();
    _renderPips();
    _renderBoard();
    _renderStats();
  }

  /**
   * Handles a card click.
   * @param {number} idx - Index into model.getCards().
   */
  function _handleCardClick(idx) {
    const result = model.flipCard(idx);

    if (result === "ignore") return;

    sound.playFlip();

    // Visually flip the clicked card
    const cardEls = board.querySelectorAll(".card");
    cardEls[idx].classList.add("flipped");

    if (result === "wait") {
      // Nothing more to do — waiting for second flip
      return;
    }

    if (result === "match") {
      // Mark both matched cards in the DOM
      model.getCards().forEach((card, i) => {
        if (card.matched) {
          cardEls[i].classList.add("matched");
          // Remove click listener by replacing with a clone
          const clone = cardEls[i].cloneNode(true);
          cardEls[i].replaceWith(clone);
        }
      });
      sound.playMatch();
      _renderStats();

      if (model.isComplete()) {
        _handleRoundComplete();
      }
      return;
    }

    if (result === "wrong") {
      // Show both wrong cards briefly, then flip back
      const [i1, i2] = model.getPendingIndices();
      sound.playWrong();
      _renderStats();

      // Shake both wrong cards
      if (i1 >= 0) cardEls[i1].classList.add("wrong");
      if (i2 >= 0) cardEls[i2].classList.add("wrong");

      setTimeout(() => {
        model.unflipPair();
        // Flip the DOM cards back
        if (i1 >= 0) {
          cardEls[i1].classList.remove("flipped", "wrong");
        }
        if (i2 >= 0) {
          cardEls[i2].classList.remove("flipped", "wrong");
        }
      }, 900);
    }
  }

  /**
   * Called when all pairs in the current round are matched.
   * Saves the round result, then advances or ends the session.
   */
  function _handleRoundComplete() {
    _stopTimer();
    sound.playRoundDone();

    const rFlips = model.getFlips();
    const rSecs  = roundSeconds;

    totalFlips   += rFlips;
    totalSeconds += rSecs;

    roundResults.push({ round: currentRound, flips: rFlips, seconds: rSecs });

    if (currentRound < TOTAL_ROUNDS) {
      // Short pause then next round
      setTimeout(() => {
        currentRound++;
        _startRound();
      }, 1200);
    } else {
      // All rounds done
      setTimeout(() => _endSession(), 1200);
    }
  }

  /**
   * Saves result and shows the result screen.
   */
  function _endSession() {
    sound.playWin();
    _saveResult(totalFlips, totalSeconds);
    _showResults();
  }

  /**
   * Populates and shows the result screen.
   */
  function _showResults() {
    resultStats.textContent = `5 rounds · ${totalFlips} total flips · ${_fmt(totalSeconds)}`;

    const best = _getBest();
    resultBest.textContent  = best !== null ? `Your best: ${best} flips` : "";

    // Round breakdown
    breakdownBody.innerHTML = "";
    roundResults.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.round}</td><td>${r.flips}</td><td>${_fmt(r.seconds)}</td>`;
      breakdownBody.appendChild(tr);
    });

    // History
    historyList.innerHTML = "";
    const hist = _loadHistory().slice(0, 8);

    if (hist.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No history yet!";
      historyList.appendChild(li);
    } else {
      hist.forEach(h => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="h-date">${h.date}</span>`
                     + `<span class="h-score">${h.flips} flips</span>`;
        historyList.appendChild(li);
      });
    }

    resultScreen.classList.remove("hidden");
  }

  // ═══════════════════════════════════════
  //  EVENT LISTENERS
  // ═══════════════════════════════════════

  helpBtn.addEventListener("click", () => {
    helpOverlay.classList.remove("hidden");
  });

  closeHelpBtn.addEventListener("click", () => {
    helpOverlay.classList.add("hidden");
  });

  restartBtn.addEventListener("click", () => {
    _stopTimer();
    _startSession();
  });

  playAgainBtn.addEventListener("click", () => {
    resultScreen.classList.add("hidden");
    _startSession();
  });

}); // end window load
