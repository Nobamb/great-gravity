export class GameController {
    constructor({
        characterModel,
        stageModel,
        inputController,
        gameView,
        physicsController = null,
    }) {
        this.characterModel = characterModel;
        this.stageModel = stageModel;
        this.inputController = inputController;
        this.gameView = gameView;
        this.physicsController = physicsController;

        this.fixedDeltaTime = 1 / 60;
        this.accumulator = 0;
        this.lastTimestamp = 0;
        this.frameHandle = null;
        this.activeTrigger = null;
        this.tick = this.tick.bind(this);
    }

    start() {
        const stageState = this.stageModel.refresh();
        const characterSize = this.gameView.measureCharacter();

        this.characterModel.syncSize(characterSize);
        this.characterModel.syncPhysics(stageState.width);
        this.characterModel.updateSpawn(this.stageModel.getSpawnPoint(characterSize));
        this.characterModel.resetToSpawn();

        this.updateActiveTrigger();
        this.physicsController?.start(this.stageModel);
        this.physicsController?.render();
        this.gameView.render(this.characterModel, {
            activeTriggerElement: this.activeTrigger?.element ?? null,
        });

        if (stageState && !stageState.changed) {
            this.lastTimestamp = 0;
        }

        this.frameHandle = window.requestAnimationFrame(this.tick);
    }

    tick(timestamp) {
        const stageState = this.stageModel.refresh();
        if (stageState) {
            this.handleStageResize(stageState);
            this.physicsController?.handleStageMutation(this.stageModel, {
                resetDynamics: stageState.changed,
            });
        }

        if (this.lastTimestamp === 0) {
            this.lastTimestamp = timestamp;
        }
        const frameTime = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
        this.lastTimestamp = timestamp;
        this.accumulator += frameTime;

        while (this.accumulator >= this.fixedDeltaTime) {
            const input = this.inputController.getSnapshot();
            const didDie = this.characterModel.update(this.fixedDeltaTime, this.stageModel, input);

            if (didDie) {
                this.handlePlayerDeath();
                this.accumulator = 0;
                break;
            }

            this.handleTriggerInteraction(input);
            this.physicsController?.step(this.fixedDeltaTime);
            this.accumulator -= this.fixedDeltaTime;
        }

        this.updateActiveTrigger();
        this.physicsController?.render();
        this.gameView.render(this.characterModel, {
            activeTriggerElement: this.activeTrigger?.element ?? null,
        });

        this.frameHandle = window.requestAnimationFrame(this.tick);
    }

    handleStageResize(stageState) {
        if (!stageState.changed) {
            return;
        }

        const characterSize = this.gameView.measureCharacter();
        this.characterModel.syncPhysics(stageState.width);
        this.characterModel.resizeWorld(stageState.scaleX, stageState.scaleY, characterSize);
        this.characterModel.updateSpawn(this.stageModel.getSpawnPoint(characterSize));
        this.updateActiveTrigger();
    }

    updateActiveTrigger() {
        const interactionPadding = Math.max(18, this.stageModel.bounds.width * 0.02);
        this.activeTrigger = this.stageModel.getInteractableTrigger(
            this.characterModel.getBounds(),
            interactionPadding,
        );
    }

    handleTriggerInteraction(input) {
        this.updateActiveTrigger();

        if (!input.interact || !this.activeTrigger) {
            return;
        }

        const collapseState = this.stageModel.activateTrigger(this.activeTrigger.id);

        if (!collapseState) {
            return;
        }

        this.gameView.animateBlockCollapse(collapseState);
        this.activeTrigger = null;
    }

    handlePlayerDeath() {
        this.gameView.resetStageState();
        this.stageModel.resetStage();

        const characterSize = this.gameView.measureCharacter();
        this.characterModel.syncSize(characterSize);
        this.characterModel.syncPhysics(this.stageModel.bounds.width);
        this.characterModel.updateSpawn(this.stageModel.getSpawnPoint(characterSize));
        this.characterModel.resetToSpawn();

        this.physicsController?.reset(this.stageModel);
        this.updateActiveTrigger();
    }
}
