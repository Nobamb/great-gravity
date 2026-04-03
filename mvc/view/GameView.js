export class GameView {
    constructor(characterElement) {
        this.characterElement = characterElement;
        this.activeTriggerElement = null;
        this.collapseTimers = new WeakMap();
    }

    measureCharacter() {
        const rect = this.characterElement.getBoundingClientRect();

        return {
            width: rect.width,
            height: rect.height,
        };
    }

    render(character, interaction = {}) {
        this.characterElement.style.transform = `translate3d(${character.x}px, ${character.y}px, 0)`;
        this.characterElement.classList.add("is-ready");
        this.characterElement.classList.toggle("is-moving", Math.abs(character.vx) > 8 && character.onGround);
        this.characterElement.classList.toggle("is-jumping", !character.onGround && !character.isClimbing);
        this.characterElement.classList.toggle("is-climbing", character.isClimbing);
        this.characterElement.classList.toggle("is-facing-left", character.facing < 0);

        if (this.activeTriggerElement && this.activeTriggerElement !== interaction.activeTriggerElement) {
            this.activeTriggerElement.classList.remove("is-interactable");
        }

        this.activeTriggerElement = interaction.activeTriggerElement || null;

        if (this.activeTriggerElement) {
            this.activeTriggerElement.classList.add("is-interactable");
        }
    }

    animateBlockCollapse({ blockElement, triggerElement, x, y, durationMs }) {
        if (!blockElement || !triggerElement) {
            return;
        }

        const previousTimer = this.collapseTimers.get(blockElement);
        if (previousTimer) {
            window.clearTimeout(previousTimer);
        }

        if (this.activeTriggerElement === triggerElement) {
            triggerElement.classList.remove("is-interactable");
            this.activeTriggerElement = null;
        }

        triggerElement.classList.add("is-used");
        blockElement.style.setProperty("--collapse-x", `${x}px`);
        blockElement.style.setProperty("--collapse-y", `${y}px`);
        blockElement.classList.add("is-collapsing");

        const timerId = window.setTimeout(() => {
            blockElement.classList.add("is-collapsed");
            blockElement.dataset.collapseState = "collapsed";
            this.collapseTimers.delete(blockElement);
        }, durationMs);

        this.collapseTimers.set(blockElement, timerId);
    }
}
