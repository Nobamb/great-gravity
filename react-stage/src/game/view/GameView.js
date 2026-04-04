export class GameView {
  constructor(characterElement) {
    this.containerElement = characterElement.parentElement;
    this.characterElement = characterElement;
    this.timerElement =
      this.containerElement?.querySelector(".timer-ui") ?? null;
    this.clearOverlayElement =
      this.containerElement?.querySelector(".clear-overlay") ?? null;
    this.clearTimeElement =
      this.clearOverlayElement?.querySelector(".clear-time") ?? null;
    this.clearRetryButton =
      this.clearOverlayElement?.querySelector(".clear-action--retry") ?? null;
    this.clearNextButton =
      this.clearOverlayElement?.querySelector(".clear-action--next") ?? null;
    this.clearMainButton =
      this.clearOverlayElement?.querySelector(".clear-action--main") ?? null;
    this.clearStarMasks = Array.from(
      this.clearOverlayElement?.querySelectorAll(".clear-star-mask") ?? [],
    );
    this.activeTriggerElement = null;
    this.collapseTimers = new Map();
    this.boundRetryClick = null;
    this.boundNextClick = null;
  }

  measureCharacter() {
    const rect = this.characterElement.getBoundingClientRect();

    return {
      width: rect.width,
      height: rect.height,
    };
  }

  bindControls({ onRetry, onNextStage } = {}) {
    this.bindButton(this.clearRetryButton, "boundRetryClick", onRetry);
    this.bindButton(this.clearNextButton, "boundNextClick", onNextStage);
  }

  bindButton(buttonElement, propertyKey, handler) {
    if (buttonElement && this[propertyKey]) {
      buttonElement.removeEventListener("click", this[propertyKey]);
    }

    this[propertyKey] = typeof handler === "function" ? handler : null;

    if (buttonElement && this[propertyKey]) {
      buttonElement.addEventListener("click", this[propertyKey]);
    }
  }

  setNextStageVisibility(isVisible) {
    if (!this.clearNextButton) {
      return;
    }

    this.clearNextButton.hidden = !isVisible;
    this.clearNextButton.disabled = !isVisible;
  }

  updateTimer(timeText) {
    if (this.timerElement) {
      this.timerElement.textContent = timeText;
    }
  }

  showClearOverlay({ timeText, stars, showNextStage = false }) {
    if (!this.clearOverlayElement) {
      return;
    }

    if (this.clearTimeElement) {
      this.clearTimeElement.textContent = timeText;
    }

    this.setNextStageVisibility(showNextStage);

    this.clearStarMasks.forEach((maskElement, index) => {
      const fillAmount = Math.max(0, Math.min(1, stars - index));
      maskElement.style.width = `${fillAmount * 100}%`;
    });

    this.clearOverlayElement.hidden = false;
  }

  hideClearOverlay() {
    if (this.clearOverlayElement) {
      this.clearOverlayElement.hidden = true;
    }
  }

    render(character, interaction = {}) {
        this.characterElement.style.transform = `translate3d(${character.x}px, ${character.y}px, 0)`;
        this.characterElement.classList.add("is-ready");
    this.characterElement.classList.toggle(
      "is-moving",
      Math.abs(character.vx) > 8 && character.onGround,
    );
    this.characterElement.classList.toggle(
      "is-jumping",
      !character.onGround && !character.isClimbing,
    );
    this.characterElement.classList.toggle("is-climbing", character.isClimbing);
        this.characterElement.classList.toggle(
            "is-facing-left",
            character.facing < 0,
        );
        this.characterElement.classList.toggle(
            "is-throw-ready",
            Boolean(interaction.canThrowStone),
        );
        this.characterElement.classList.toggle(
            "is-throwing",
            Boolean(interaction.isDraggingStone),
        );

        if (
            this.activeTriggerElement &&
      this.activeTriggerElement !== interaction.activeTriggerElement
    ) {
      this.activeTriggerElement.classList.remove("is-interactable");
    }

    this.activeTriggerElement = interaction.activeTriggerElement || null;

    if (this.activeTriggerElement) {
      this.activeTriggerElement.classList.add("is-interactable");
    }
  }

  animateTriggerResult({ triggerElement, animations = [], durationMs }) {
    if (!triggerElement) {
      return;
    }

    if (this.activeTriggerElement === triggerElement) {
      triggerElement.classList.remove("is-interactable");
      this.activeTriggerElement = null;
    }

    triggerElement.classList.add("is-used");

    animations.forEach(({ targetElement, x, y }) => {
      if (!targetElement) {
        return;
      }

      const previousTimer = this.collapseTimers.get(targetElement);
      if (previousTimer) {
        window.clearTimeout(previousTimer);
      }

      targetElement.style.setProperty("--collapse-x", `${x}px`);
      targetElement.style.setProperty("--collapse-y", `${y}px`);
      targetElement.classList.add("is-collapsing");

      const timerId = window.setTimeout(() => {
        targetElement.classList.add("is-collapsed");
        targetElement.dataset.collapseState = "collapsed";
        this.collapseTimers.delete(targetElement);
      }, durationMs);

      this.collapseTimers.set(targetElement, timerId);
    });
  }

  resetStageState() {
    for (const timerId of this.collapseTimers.values()) {
      window.clearTimeout(timerId);
    }
    this.collapseTimers.clear();

    this.activeTriggerElement?.classList.remove("is-interactable");
    this.activeTriggerElement = null;

    if (!this.containerElement) {
      return;
    }

    const triggerableElements = Array.from(
      this.containerElement.querySelectorAll('[data-triggerable="true"]'),
    );

    triggerableElements.forEach((element) => {
      element.classList.add("is-resetting");
      element.classList.remove("is-collapsing", "is-collapsed");
      element.style.removeProperty("--collapse-x");
      element.style.removeProperty("--collapse-y");
    });

    this.containerElement
      .querySelectorAll(
        ".trigger-block.is-used, .trigger-block.is-interactable",
      )
      .forEach((element) => {
        element.classList.remove("is-used", "is-interactable");
      });

    // Trigger 블록이 죽은 직후에도 완전히 초기 위치/상태로 되돌아오도록 레이아웃을 확정합니다.
    void this.containerElement.offsetWidth;

    triggerableElements.forEach((element) => {
      element.classList.remove("is-resetting");
    });

    this.hideClearOverlay();
  }

  destroy() {
    if (this.clearRetryButton && this.boundRetryClick) {
      this.clearRetryButton.removeEventListener("click", this.boundRetryClick);
    }
    if (this.clearNextButton && this.boundNextClick) {
      this.clearNextButton.removeEventListener("click", this.boundNextClick);
    }

    for (const timerId of this.collapseTimers.values()) {
      window.clearTimeout(timerId);
    }

    this.collapseTimers.clear();
    this.activeTriggerElement?.classList.remove("is-interactable");
    this.activeTriggerElement = null;
    this.boundRetryClick = null;
    this.boundNextClick = null;
  }
}
