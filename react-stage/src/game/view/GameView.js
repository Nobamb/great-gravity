export class GameView {
  constructor(characterElement, { heldStoneElement = null, stoneAimElement = null } = {}) {
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
    this.worldStoneElement =
      this.containerElement?.querySelector(".throw-stone") ?? null;
    this.heldStoneElement =
      heldStoneElement ?? this.characterElement?.querySelector(".held-stone") ?? null;
    this.stoneAimElement =
      stoneAimElement ?? this.containerElement?.querySelector("[data-stone-aim-line]") ?? null;
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
        this.renderHeldStone(interaction.heldStone ?? null);
        this.renderStoneAim(interaction.stoneAim ?? null);

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

  renderHeldStone(heldStone) {
    if (!this.heldStoneElement) {
      return;
    }

    const isHeld = Boolean(heldStone?.position);

    this.heldStoneElement.hidden = !isHeld;
    this.heldStoneElement.classList.toggle("is-held-ui", isHeld);
    this.heldStoneElement.classList.toggle("is-carried", isHeld);

    if (!isHeld) {
      this.heldStoneElement.style.left = "";
      this.heldStoneElement.style.top = "";
      this.heldStoneElement.style.transform = "";
      return;
    }

    this.heldStoneElement.style.left = "";
    this.heldStoneElement.style.top = "";
    this.heldStoneElement.style.transform = "";
  }

  renderStoneAim(stoneAim) {
    if (!this.stoneAimElement) {
      return;
    }

    if (!stoneAim?.start || !stoneAim?.end) {
      this.stoneAimElement.setAttribute("hidden", "");
      this.stoneAimElement.style.display = "none";
      this.stoneAimElement.setAttribute("x1", "0");
      this.stoneAimElement.setAttribute("y1", "0");
      this.stoneAimElement.setAttribute("x2", "0");
      this.stoneAimElement.setAttribute("y2", "0");
      return;
    }

    this.stoneAimElement.removeAttribute("hidden");
    this.stoneAimElement.style.display = "block";
    this.stoneAimElement.setAttribute("x1", `${stoneAim.start.x}`);
    this.stoneAimElement.setAttribute("y1", `${stoneAim.start.y}`);
    this.stoneAimElement.setAttribute("x2", `${stoneAim.end.x}`);
    this.stoneAimElement.setAttribute("y2", `${stoneAim.end.y}`);
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

    if (this.stoneAimElement) {
      this.stoneAimElement.setAttribute("hidden", "");
      this.stoneAimElement.style.display = "none";
      this.stoneAimElement.setAttribute("x1", "0");
      this.stoneAimElement.setAttribute("y1", "0");
      this.stoneAimElement.setAttribute("x2", "0");
      this.stoneAimElement.setAttribute("y2", "0");
    }

    if (this.heldStoneElement) {
      this.heldStoneElement.hidden = true;
      this.heldStoneElement.classList.remove("is-held-ui", "is-carried", "is-airborne");
      this.heldStoneElement.style.left = "";
      this.heldStoneElement.style.top = "";
      this.heldStoneElement.style.transform = "";
    }

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
    if (this.stoneAimElement) {
      this.stoneAimElement.setAttribute("hidden", "");
      this.stoneAimElement.style.display = "none";
      this.stoneAimElement.setAttribute("x1", "0");
      this.stoneAimElement.setAttribute("y1", "0");
      this.stoneAimElement.setAttribute("x2", "0");
      this.stoneAimElement.setAttribute("y2", "0");
    }
    if (this.heldStoneElement) {
      this.heldStoneElement.hidden = true;
      this.heldStoneElement.classList.remove("is-held-ui", "is-carried", "is-airborne");
      this.heldStoneElement.style.left = "";
      this.heldStoneElement.style.top = "";
      this.heldStoneElement.style.transform = "";
    }
    this.boundRetryClick = null;
    this.boundNextClick = null;
  }
}
