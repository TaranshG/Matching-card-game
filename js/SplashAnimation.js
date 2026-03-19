/**
 * File: js/SplashAnimation.js
 * Author: Taransh Goyal
 * Description: Draws the animated intro banner on the splash screen canvas.
 *              Shows several emoji cards dropping into place from above,
 *              followed by the game title fading in.
 *              Reveals the start button after ~2 seconds.
 * Date: 2026
 */

"use strict";

/**
 * SplashAnimation class
 * Runs a canvas animation on the splash screen.
 */
class SplashAnimation {

  /**
   * @param {HTMLCanvasElement} canvas   - The canvas to draw on.
   * @param {HTMLButtonElement} startBtn - Button revealed after the animation.
   * @param {Function}          onStart  - Callback fired when the button is clicked.
   */
  constructor(canvas, startBtn, onStart) {
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;

    /** @type {CanvasRenderingContext2D} */
    this.ctx = canvas.getContext("2d");

    /** @type {Function} */
    this.onStart = onStart;

    /** @type {number|null} requestAnimationFrame handle. */
    this.rafId = null;

    /** @type {Array<Object>} Animated card data. */
    this.cards = [];

    this._resize();
    this._buildCards();
    this._run();

    // Show the start button after 2 seconds
    setTimeout(() => {
      startBtn.classList.remove("hidden");
      startBtn.addEventListener("click", () => {
        this.stop();
        onStart();
      }, { once: true });
    }, 2000);
  }

  /**
   * Sets canvas pixel size to match its CSS size.
   */
  _resize() {
    const r          = this.canvas.getBoundingClientRect();
    this.canvas.width  = r.width  || 380;
    this.canvas.height = r.height || 300;
  }

  /**
   * Creates the set of card objects to animate.
   */
  _buildCards() {
    const emojis = ["🐶","🐱","🐶","🐱","🦊","🦊"];
    const cw     = this.canvas.width;
    const ch     = this.canvas.height;
    const cols   = 3;
    const cardW  = 72;
    const cardH  = 80;
    const gap    = 14;
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = (cw - totalW) / 2;
    const row1Y  = ch * 0.08;
    const row2Y  = row1Y + cardH + gap;

    this.cards = emojis.map((emoji, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        emoji,
        targetX: startX + col * (cardW + gap),
        targetY: row === 0 ? row1Y : row2Y,
        x:       startX + col * (cardW + gap),
        y:       -cardH - 30 - i * 20,   // start above canvas
        vy:      0,
        landed:  false,
        w:       cardW,
        h:       cardH,
        delay:   i * 80,                 // ms stagger
      };
    });

    this._cardW = cardW;
    this._cardH = cardH;
    this._gridEndY = row2Y + cardH;
  }

  /**
   * Draws one animation frame.
   * @param {number} elapsed - Milliseconds since start.
   */
  _draw(elapsed) {
    const { ctx, canvas } = this;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Light pastel background to match the page
    ctx.fillStyle = "#fff9f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Animate each card falling down (simple gravity)
    for (const c of this.cards) {
      if (elapsed < c.delay) continue;

      if (!c.landed) {
        c.vy += 0.8;                     // gravity
        c.y  += c.vy;

        if (c.y >= c.targetY) {
          c.y      = c.targetY;
          c.vy     = -c.vy * 0.35;       // bounce
          if (Math.abs(c.vy) < 1) {
            c.vy    = 0;
            c.landed = true;
          }
        }
      }

      // Draw card back (blue rounded rect)
      ctx.save();
      ctx.fillStyle   = "#5c7cfa";
      ctx.strokeStyle = "#3a5fd9";
      ctx.lineWidth   = 2.5;
      this._rrect(ctx, c.x, c.y, c.w, c.h, 10);
      ctx.fill();
      ctx.stroke();

      // Question mark on back
      ctx.fillStyle    = "rgba(255,255,255,0.7)";
      ctx.font         = "2rem Fredoka One, cursive";
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("❓", c.x + c.w / 2, c.y + c.h / 2);
      ctx.restore();
    }

    // Title fades in after 1.4s
    const titleAge   = elapsed - 1400;
    const titleAlpha = Math.max(0, Math.min(titleAge / 400, 1));

    if (titleAlpha > 0) {
      const ty = this._gridEndY + 36;
      ctx.save();
      ctx.globalAlpha = titleAlpha;

      ctx.font         = "bold 2rem 'Fredoka One', cursive";
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle    = "#9b59b6";
      ctx.fillText("Memory Match! 🧠", canvas.width / 2, ty);

      ctx.font      = "0.8rem 'Nunito', sans-serif";
      ctx.fillStyle = "#636e72";
      ctx.fillText("find all the pairs!", canvas.width / 2, ty + 30);

      ctx.restore();
    }
  }

  /**
   * Helper: draws a rounded rectangle path.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {number} r - Corner radius.
   */
  _rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
    ctx.lineTo(x,     y + r);
    ctx.quadraticCurveTo(x,     y,     x + r, y);
    ctx.closePath();
  }

  /**
   * Starts the rAF animation loop.
   */
  _run() {
    const t0 = performance.now();
    const loop = (now) => {
      this._draw(now - t0);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * Stops the animation loop. Call before transitioning away from splash.
   */
  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
