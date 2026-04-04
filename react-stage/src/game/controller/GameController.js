function intersects(a, b) {
    return (
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top
    );
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export class GameController {
    constructor({
        stage,
        nextStagePath = null,
        navigate = null,
        characterModel,
        stageModel,
        inputController,
        gameView,
        physicsController = null,
    }) {
        this.stage = stage;
        this.nextStagePath = nextStagePath;
        this.navigate = navigate;
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
        this.isDraggingStone = false;
        this.tick = this.tick.bind(this);
    }

    start() {
        this.stop();

        const stageState = this.stageModel.refresh();
        const characterSize = this.gameView.measureCharacter();

        this.characterModel.syncSize(characterSize);
        this.characterModel.syncPhysics(stageState.width);
        this.characterModel.updateSpawn(this.stageModel.getSpawnPoint(characterSize));
        this.characterModel.resetToSpawn();
        this.elapsedTimeMs = 0;
        this.isStageCleared = false;
        this.isDraggingStone = false;
        this.gameView.bindControls({
            onRetry: () => {
                this.restartStage();
            },
            onNextStage: this.nextStagePath
                ? () => {
                    this.navigate?.(this.nextStagePath);
                }
                : null,
        });
        this.gameView.hideClearOverlay();
        this.gameView.setNextStageVisibility(false);
        this.gameView.updateTimer(this.formatTime(this.elapsedTimeMs));

        this.updateActiveTrigger();
        this.physicsController?.start(this.stageModel);
        this.syncPhysicsRuntimeState();
        this.physicsController?.render();
        this.gameView.render(this.characterModel, {
            activeTriggerElement: this.activeTrigger?.element ?? null,
            canThrowStone: this.canThrowStone(),
            isDraggingStone: this.isDraggingStone,
        });

        if (stageState && !stageState.changed) {
            this.lastTimestamp = 0;
        }

        this.frameHandle = window.requestAnimationFrame(this.tick);
    }

    stop() {
        if (this.frameHandle !== null) {
            window.cancelAnimationFrame(this.frameHandle);
            this.frameHandle = null;
        }
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
                canThrowStone: false,
                isDraggingStone: false,
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
            this.handleStoneInteraction(input);
            this.physicsController?.step(this.fixedDeltaTime);
            this.handleProjectileTriggerHits();
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
            canThrowStone: this.canThrowStone(),
            isDraggingStone: this.isDraggingStone,
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

        this.gameView.animateTriggerResult(collapseState);
        this.activeTrigger = null;
    }

    handlePlayerDeath() {
        this.isDraggingStone = false;
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
        this.isDraggingStone = false;
        this.gameView.hideClearOverlay();
        this.gameView.setNextStageVisibility(false);
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
        this.isDraggingStone = false;
        this.gameView.showClearOverlay({
            timeText: this.formatTime(this.elapsedTimeMs),
            stars: this.getStarRating(this.elapsedTimeMs),
            showNextStage: Boolean(this.stage?.supportsNextStage && this.nextStagePath),
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

    canThrowStone() {
        return this.physicsController?.canPickupStone?.(
            this.characterModel.getBounds(),
            Math.max(16, this.stageModel.bounds.width * 0.015),
        ) ?? false;
    }

    handleStoneInteraction(input) {
        const pointer = input.pointer;

        if (!pointer || !this.physicsController?.getStoneBounds?.()) {
            this.isDraggingStone = false;
            return;
        }

        if (!this.isDraggingStone) {
            if (
                pointer.justPressed &&
                pointer.startedOnCharacter &&
                this.canThrowStone()
            ) {
                this.isDraggingStone = true;
                this.physicsController.holdStoneAt(this.getStoneCarryPoint());
            }
            return;
        }

        const carryPoint = this.getStoneCarryPoint();
        this.physicsController.holdStoneAt(carryPoint);

        if (!pointer.isDown && !pointer.justReleased) {
            this.physicsController.throwStone({
                position: carryPoint,
                velocity: {
                    x: this.characterModel.facing * 2.5,
                    y: -2,
                },
            });
            this.isDraggingStone = false;
            return;
        }

        if (!pointer.justReleased) {
            return;
        }

        const throwVelocity = this.getStoneThrowVelocity(
            pointer.dragStart ?? carryPoint,
            pointer.position ?? pointer.dragStart ?? carryPoint,
        );

        this.physicsController.throwStone({
            position: carryPoint,
            velocity: throwVelocity,
        });
        this.isDraggingStone = false;
    }

    getStoneCarryPoint() {
        const bounds = this.characterModel.getBounds();
        const offsetX = bounds.width * 0.4 * this.characterModel.facing;

        return {
            x: bounds.left + bounds.width / 2 + offsetX,
            y: bounds.top + bounds.height * 0.34,
        };
    }

    getStoneThrowVelocity(startPoint, endPoint) {
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const dragDistance = Math.sqrt(dx * dx + dy * dy);
        const strength = clamp(dragDistance, 18, 220);
        const scale = 0.085;
        const baseX = dx * scale;
        const baseY = dy * scale;
        const extraScale = strength / 140;

        return {
            x: clamp(baseX * extraScale, -18, 18),
            y: clamp(baseY * extraScale, -18, 16),
        };
    }

    handleProjectileTriggerHits() {
        const triggerIds = this.physicsController?.consumeTriggerHits?.() ?? [];

        triggerIds.forEach((triggerId) => {
            const collapseState = this.stageModel.activateTrigger(triggerId);

            if (!collapseState) {
                return;
            }

            this.gameView.animateTriggerResult(collapseState);

            if (this.activeTrigger?.id === triggerId) {
                this.activeTrigger = null;
            }
        });
    }

    destroy() {
        this.stop();
        this.physicsController?.destroy?.();
        this.inputController?.destroy?.();
        this.stageModel?.destroy?.();
        this.gameView?.destroy?.();
    }
}
