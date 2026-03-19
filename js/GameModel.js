/**
 * File: js/GameModel.js
 * Author: CS1XD3 Student
 * Description: Models the complete state of the Memory Match game.
 *              Manages the card deck, flip logic, match detection,
 *              flip counting, progress tracking, and board shuffling.
 *              The view (DOM) never writes state back into this model.
 * Date: 2026
 */

"use strict";

/**
 * GameModel class
 * Tracks all state for one round of the memory matching game.
 */
class GameModel {

  /**
   * All possible emoji symbols used as card faces.
   * A subset is chosen each round depending on pairCount.
   * @type {string[]}
   */
  static EMOJI_POOL = [
    "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼",
    "🐨","🦁","🐸","🐙","🦋","🌈","⭐","🍕",
    "🍦","🎈","🎸","🚀","🌺","🍄","🦄","🎯"
  ];

  /**
   * @param {number} pairCount - Number of matching pairs on the board (e.g. 6 for a 4×3 grid).
   */
  constructor(pairCount) {
    /** @type {number} How many pairs are on this board. */
    this.pairCount = pairCount;

    /** @type {Card[]} Flat array of Card objects making up the board. */
    this.cards = [];

    /** @type {number} Total card flips so far this round. */
    this.flips = 0;

    /** @type {number} Number of matched pairs found so far. */
    this.matchesFound = 0;

    /** @type {Card|null} The first card flipped in the current turn (waiting for second). */
    this.firstCard = null;

    /** @type {boolean} True while the board is locked (e.g. briefly after a wrong pair flip). */
    this.locked = false;

    this._buildDeck();
  }

  // ─── Private helpers ──────────────────────────────────────────────

  /**
   * Builds and shuffles the card deck using a random selection of emojis.
   */
  _buildDeck() {
    // Pick pairCount distinct emojis from the pool (shuffle pool first)
    const pool    = [...GameModel.EMOJI_POOL].sort(() => Math.random() - 0.5);
    const chosen  = pool.slice(0, this.pairCount);

    // Create two Card objects per emoji
    const rawCards = [];
    chosen.forEach((emoji, pairId) => {
      rawCards.push(new Card(0, emoji, pairId));  // id assigned after shuffle
      rawCards.push(new Card(0, emoji, pairId));
    });

    // Fisher-Yates shuffle
    for (let i = rawCards.length - 1; i > 0; i--) {
      const j      = Math.floor(Math.random() * (i + 1));
      const tmp    = rawCards[i];
      rawCards[i]  = rawCards[j];
      rawCards[j]  = tmp;
    }

    // Assign final positional IDs
    rawCards.forEach((card, idx) => { card.id = idx; });
    this.cards = rawCards;
  }

  // ─── Public API ───────────────────────────────────────────────────

  /**
   * Attempts to flip the card at the given index.
   * Returns a result string describing what happened:
   *   "wait"    – first card flipped, waiting for second
   *   "match"   – both cards match; they stay face-up
   *   "wrong"   – cards don't match; board locks briefly
   *   "ignore"  – flip not allowed (already matched, already face-up, or board locked)
   *
   * @param {number} cardIndex - Index in this.cards.
   * @returns {string} Result key.
   */
  flipCard(cardIndex) {
    const card = this.cards[cardIndex];

    // Guard: locked, already matched, or this card is already the waiting first card
    if (this.locked || card.matched || card === this.firstCard) {
      return "ignore";
    }

    card.faceUp = true;
    this.flips++;

    // First card of the turn
    if (this.firstCard === null) {
      this.firstCard = card;
      return "wait";
    }

    // Second card – compare with first
    const first = this.firstCard;
    this.firstCard = null;

    if (card.pairId === first.pairId) {
      // Match!
      card.matched  = true;
      first.matched = true;
      this.matchesFound++;
      return "match";
    }

    // No match – lock the board; caller is responsible for calling unflipPair() after delay
    this.locked         = true;
    this._pendingCard1  = first;
    this._pendingCard2  = card;
    return "wrong";
  }

  /**
   * Flips both wrong cards back face-down and unlocks the board.
   * Should be called by the view after the "wrong" display delay.
   */
  unflipPair() {
    if (this._pendingCard1) this._pendingCard1.faceUp = false;
    if (this._pendingCard2) this._pendingCard2.faceUp = false;
    this._pendingCard1 = null;
    this._pendingCard2 = null;
    this.locked        = false;
  }

  /**
   * Returns the indices of the two cards waiting to be unflipped after a wrong guess.
   * @returns {number[]} Array of two card indices.
   */
  getPendingIndices() {
    return [
      this._pendingCard1 ? this._pendingCard1.id : -1,
      this._pendingCard2 ? this._pendingCard2.id : -1,
    ];
  }

  /**
   * Returns true when all pairs have been matched.
   * @returns {boolean}
   */
  isComplete() {
    return this.matchesFound === this.pairCount;
  }

  /**
   * Returns a completion percentage (0–100) based on pairs found.
   * @returns {number}
   */
  getProgress() {
    return Math.round((this.matchesFound / this.pairCount) * 100);
  }

  /**
   * Returns the full card array (read-only use intended by the view).
   * @returns {Card[]}
   */
  getCards() { return this.cards; }

  /**
   * Returns total flips made this round.
   * @returns {number}
   */
  getFlips() { return this.flips; }

  /**
   * Returns the number of matched pairs found.
   * @returns {number}
   */
  getMatches() { return this.matchesFound; }
}
