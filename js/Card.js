/**
 * File: js/Card.js
 * Author: Taransh Goyal
 * Description: Represents a single card in the memory matching game.
 *              Tracks the card's emoji symbol, whether it is face-up,
 *              and whether it has been matched.
 * Date: 2026
 */

"use strict";

/**
 * Card class
 * Stores the state of one card on the game board (model only, no DOM).
 */
class Card {

  /**
   * @param {number} id     - Unique index for this card on the board.
   * @param {string} emoji  - The emoji symbol shown when the card is flipped.
   * @param {number} pairId - Identifier shared by the two cards that form a pair.
   */
  constructor(id, emoji, pairId) {
    /** @type {number} Unique position index. */
    this.id = id;

    /** @type {string} Emoji displayed on the face of the card. */
    this.emoji = emoji;

    /** @type {number} Pair group identifier (two cards share the same pairId). */
    this.pairId = pairId;

    /** @type {boolean} True when the card is currently flipped face-up. */
    this.faceUp = false;

    /** @type {boolean} True once this card has been successfully matched. */
    this.matched = false;
  }

  /**
   * Returns true if this card is face-up but not yet matched (i.e. waiting
   * for a second card to compare against).
   * @returns {boolean}
   */
  isWaiting() {
    return this.faceUp && !this.matched;
  }
}
