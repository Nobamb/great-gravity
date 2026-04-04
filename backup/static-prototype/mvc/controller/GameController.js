function intersects(a, b) {
    return (
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top
    );
}

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
        this.elapsedTimeMs = 0;
        this.isStageCleared = false;
        this.tick = this.tick.bind(this);
    }

    start() {
        const stageState = this.stageModel.refresh();
        const characterSize = this.gameView.measureCharacter();

        this.characterModel.syncSize(characterSize);
        this.characterModel.syncPhysics(stageState.width);
        this.characterModel.updateSpawn(this.stageModel.getSpawnPoint(characterSize));
        this.characterModel.resetToSpawn();
        this.elapsedTimeMs = 0;
        this.isStageCleared = false;
        this.gameView.bindControls({
            onRetry: () => {
                this.restartStage();
            },
        });
        this.gameView.hideClearOverlay();
        this.gameView.updateTimer(this.formatTime(this.elapsedTimeMs));

        this.updateActiveTrigger();
        this.physicsController?.start(this.stageModel);
        this.syncPhysicsRuntimeState();
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

        if (this.isStageCleared) {
            this.physicsController?.render();
            this.gameView.render(this.characterModel, {
                activeTriggerElement: null,
            });
            this.frameHandle = window.requestAnimationFrame(this.tick);
            return;
        }

        while (this.accumulator >= this.fixedDeltaTime) {
            const input = this.inputController.getSnapshot();
            const didDie = this.characterModel.update(this.fixedDeltaTime, this.stageModel, input);
            this.elapsedTimeMs += this.fixedDeltaTime * 1000;

            if (this.isTreasureCollected()) {
                this.handleStageClear();
                this.accumulator = 0;
                break;
            }

            if (didDie) {
                this.handlePlayerDeath();
                this.accumulator = 0;
                break;
            }

            this.handleTriggerInteraction(input);
            this.physicsController?.step(this.fixedDeltaTime);
            this.syncPhysicsRuntimeState();
            this.accumulator -= this.fixedDeltaTime;
        }

        this.gameView.updateTimer(this.formatTime(this.elapsedTimeMs));

        if (this.isStageCleared) {
            this.physicsController?.render();
            this.gameView.render(this.characterModel, {
                activeTriggerElement: null,
            });
            this.frameHandle = window.requestAnimationFrame(this.tick);
            return;
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
        this.restartStage();
    }

    restartStage() {
        this.gameView.resetStageState();
        this.inputController.resetTransientActions?.();
        this.stageModel.resetStage();
        const resetStageState = this.stageModel.refresh();

        const characterSize = this.gameView.measureCharacter();
        this.characterModel.syncSize(characterSize);
        this.characterModel.syncPhysics(
            resetStageState?.width ?? this.stageModel.bounds.width,
        );
        this.characterModel.updateSpawn(this.stageModel.getSpawnPoint(characterSize));
        this.characterModel.resetToSpawn();

        this.physicsController?.reset(this.stageModel);
        this.syncPhysicsRuntimeState();
        this.elapsedTimeMs = 0;
        this.isStageCleared = false;
        this.gameView.hideClearOverlay();
        this.gameView.updateTimer(this.formatTime(this.elapsedTimeMs));
        this.accumulator = 0;
        this.lastTimestamp = 0;
        this.activeTrigger = null;
        this.updateActiveTrigger();
    }

    isTreasureCollected() {
        const treasureBounds = this.physicsController?.getTreasureBounds?.();

        if (!treasureBounds) {
            return false;
        }

        return intersects(this.characterModel.getBounds(), treasureBounds);
    }

    handleStageClear() {
        this.isStageCleared = true;
        this.inputController.resetTransientActions?.();
        this.activeTrigger = null;
        this.gameView.showClearOverlay({
            timeText: this.formatTime(this.elapsedTimeMs),
            stars: this.getStarRating(this.elapsedTimeMs),
        });
    }

    getStarRating(timeMs) {
        const overtimeMs = Math.max(0, timeMs - 30000);
        const penaltySteps = Math.ceil(overtimeMs / 5000);
        return Math.max(0, 3 - penaltySteps * 0.5);
    }

    formatTime(timeMs) {
        const totalCentiseconds = Math.max(0, Math.floor(timeMs / 10));
        const minutes = Math.floor(totalCentiseconds / 6000);
        const seconds = Math.floor((totalCentiseconds % 6000) / 100);
        const centiseconds = totalCentiseconds % 100;

        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(centiseconds).padStart(2, "0")}`;
    }

    syncPhysicsRuntimeState() {
        this.stageModel.setRuntimeSolids(
            this.physicsController?.getSolidifiedBlocks?.() ?? [],
        );
        this.stageModel.setRuntimeHazards(
            this.physicsController?.getLavaHazards?.() ?? [],
        );
    }
}
