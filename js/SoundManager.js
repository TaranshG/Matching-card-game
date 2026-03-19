/**
 * File: js/SoundManager.js
 * Author: CS1XD3 Student
 * Description: Generates all sound effects using the Web Audio API.
 *              No external audio files needed. Sounds: card flip,
 *              match success, wrong-pair buzz, and win fanfare.
 *              AudioContext is created lazily on first use.
 * Date: 2026
 */

"use strict";

/**
 * SoundManager class
 * Creates synthesised sound effects on demand via the Web Audio API.
 */
class SoundManager {

  constructor() {
    /** @type {AudioContext|null} Lazily created on first call. */
    this._ctx = null;
  }

  /**
   * Returns the AudioContext, creating it on first call.
   * @returns {AudioContext}
   */
  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._ctx;
  }

  /**
   * Plays a single synthesised tone.
   * @param {number} freq     - Frequency in Hz.
   * @param {number} duration - Duration in seconds.
   * @param {string} type     - Oscillator waveform type.
   * @param {number} gain     - Peak gain (0–1).
   * @param {number} [delay]  - Start offset in seconds (default 0).
   */
  _tone(freq, duration, type = "sine", gain = 0.18, delay = 0) {
    const ctx  = this._getCtx();
    const osc  = ctx.createOscillator();
    const gn   = ctx.createGain();

    osc.connect(gn);
    gn.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gn.gain.setValueAtTime(0, ctx.currentTime + delay);
    gn.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime  + delay + duration + 0.01);
  }

  /**
   * Soft whoosh when a card flips.
   */
  playFlip() {
    this._tone(400, 0.08, "triangle", 0.12);
  }

  /**
   * Happy chime when a pair is matched.
   */
  playMatch() {
    this._tone(660, 0.15, "sine", 0.20, 0.00);
    this._tone(880, 0.20, "sine", 0.18, 0.14);
  }

  /**
   * Low buzz when two cards don't match.
   */
  playWrong() {
    this._tone(180, 0.22, "square", 0.10);
  }

  /**
   * Short round-complete jingle.
   */
  playRoundDone() {
    this._tone(523, 0.15, "sine", 0.20, 0.00);
    this._tone(659, 0.15, "sine", 0.20, 0.14);
    this._tone(784, 0.22, "sine", 0.20, 0.28);
  }

  /**
   * Big ascending fanfare for completing all rounds.
   */
  playWin() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this._tone(f, 0.25, "sine", 0.22, i * 0.12);
    });
  }
}
