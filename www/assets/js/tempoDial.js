export class TempoDialController {
  constructor({ inputEl, dialEls = [], defaultValue = 0, onValueChange = null }) {
    this.inputEl = inputEl;
    this.dialEls = dialEls.filter(Boolean);
    this.defaultValue = defaultValue;
    this.onValueChange = typeof onValueChange === "function" ? onValueChange : null;
  }

  getNumberAttribute(attrName, fallback) {
    if (!this.inputEl) return fallback;
    const raw = this.inputEl.getAttribute(attrName);
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  getInputValue(fallback = this.defaultValue) {
    if (!this.inputEl) return fallback;
    const raw = this.inputEl.value;
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  setValue(value, { notify = false } = {}) {
    if (!this.inputEl) return;
    this.inputEl.value = value.toString();
    if (notify) {
      this.notifyChange(value);
    }
  }

  clamp(value) {
    const minValue = this.getNumberAttribute("min", Number.NEGATIVE_INFINITY);
    const maxValue = this.getNumberAttribute("max", Number.POSITIVE_INFINITY);
    return Math.min(maxValue, Math.max(minValue, value));
  }

  adjustBy(delta) {
    if (!this.inputEl) return;
    const baseValue = this.getInputValue();
    const nextValue = this.clamp(baseValue + delta);
    this.setValue(nextValue, { notify: true });
  }

  applyStoredValue(value) {
    if (value === null || value === undefined) return;
    this.setValue(this.clamp(value));
  }

  notifyChange(value) {
    if (this.onValueChange) {
      this.onValueChange(value);
    }
  }

  attach() {
    if (!this.inputEl) return;

    this.inputEl.addEventListener("change", () => {
      const clamped = this.clamp(this.getInputValue());
      this.setValue(clamped, { notify: true });
    });

    this.dialEls.forEach((dialEl) => this.setupDial(dialEl));
  }

  angleDiff(current, previous) {
    let diff = current - previous;
    while (diff <= -180) diff += 360;
    while (diff > 180) diff -= 360;
    return diff;
  }

  getAngle(dialEl, event) {
    const rect = dialEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  setupDial(dialEl) {
    if (!dialEl) return;
    const step = Number.parseFloat(dialEl.dataset.step || "1");
    const degreesPerStep = Number.parseFloat(dialEl.dataset.degreesPerStep || "18");
    let isActive = false;
    let lastAngle = 0;
    let carry = 0;

    dialEl.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      dialEl.setPointerCapture(event.pointerId);
      isActive = true;
      lastAngle = this.getAngle(dialEl, event);
      carry = 0;
    });

    dialEl.addEventListener("pointermove", (event) => {
      if (!isActive) return;
      const currentAngle = this.getAngle(dialEl, event);
      const diff = this.angleDiff(currentAngle, lastAngle);
      carry += diff;
      const steps = Math.trunc(carry / degreesPerStep);
      if (steps !== 0) {
        this.adjustBy(steps * step);
        carry -= steps * degreesPerStep;
      }
      if (diff > 0) {
        dialEl.classList.add("isTurningPositive");
        dialEl.classList.remove("isTurningNegative");
      } else if (diff < 0) {
        dialEl.classList.add("isTurningNegative");
        dialEl.classList.remove("isTurningPositive");
      }
      lastAngle = currentAngle;
    });

    const releaseDial = () => {
      isActive = false;
      carry = 0;
      dialEl.classList.remove("isTurningPositive", "isTurningNegative");
    };

    dialEl.addEventListener("pointerup", releaseDial);
    dialEl.addEventListener("pointercancel", releaseDial);
    dialEl.addEventListener("lostpointercapture", releaseDial);
  }
}
