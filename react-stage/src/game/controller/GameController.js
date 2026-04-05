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
        this.isPreparingStoneThrow = false;
        this.stoneAim = null;
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
        this.isPreparingStoneThrow = false;
        this.stoneAim = null;
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
            stoneState: this.getStoneState(),
            heldStone: this.getHeldStoneInteraction(),
            stoneAim: this.stoneAim,
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
                stoneState: this.getStoneState(),
                heldStone: null,
                stoneAim: null,
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

            this.handleStoneAutoPickup();
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
                stoneState: this.getStoneState(),
                heldStone: null,
                stoneAim: null,
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
            stoneState: this.getStoneState(),
            heldStone: this.getHeldStoneInteraction(),
            stoneAim: this.stoneAim,
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
        this.isPreparingStoneThrow = false;
        this.stoneAim = null;
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
        this.isPreparingStoneThrow = false;
        this.stoneAim = null;
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
        this.isPreparingStoneThrow = false;
        this.stoneAim = null;
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
        if (this.getStoneState() === "held") {
            return true;
        }

        return this.physicsController?.canPickupStone?.(
            this.characterModel.getBounds(),
            Math.max(16, this.stageModel.bounds.width * 0.015),
        ) ?? false;
    }

    getStoneState() {
        return this.physicsController?.getStoneState?.() ?? "missing";
    }

    getHeldStoneInteraction() {
        if (this.getStoneState() !== "held") {
            return null;
        }

        return {
            position:
                this.physicsController?.getHeldStonePosition?.()
                ?? this.getStoneCarryPoint(),
            isAiming: this.isDraggingStone,
        };
    }

    handleStoneAutoPickup() {
        if (this.getStoneState() !== "grounded") {
            return;
        }

        const canPickup = this.physicsController?.canPickupStone?.(
            this.characterModel.getBounds(),
            Math.max(12, this.stageModel.bounds.width * 0.012),
        );

        if (!canPickup) {
            return;
        }

        const carryPoint = this.getStoneCarryPoint();
        this.physicsController.pickupStone(carryPoint);
        this.physicsController.setHeldStonePosition(carryPoint);
        this.isDraggingStone = false;
        this.isPreparingStoneThrow = false;
        this.stoneAim = null;
    }

    handleStoneInteraction(input) {
        const pointer = input.pointer;
        const stoneState = this.getStoneState();
        const aimThreshold = Math.max(34, this.stageModel.bounds.width * 0.028);

        if (!pointer || !this.physicsController) {
            this.isDraggingStone = false;
            this.stoneAim = null;
            return;
        }

        if (stoneState === "held") {
            const carryPoint = this.getStoneCarryPoint();
            const pointerPosition = pointer.position ?? carryPoint;
            const dragDistance = this.getPointerDistance(
                pointer.dragStart ?? pointerPosition,
                pointerPosition,
            );

            this.physicsController.setHeldStonePosition(carryPoint);

            if (pointer.justPressed) {
                this.isPreparingStoneThrow = true;
                this.isDraggingStone = false;
                this.physicsController.clearStoneProjectileState();
            }

            if (pointer.isDown && !this.isPreparingStoneThrow) {
                this.isPreparingStoneThrow = true;
            }

            if (pointer.isDown && dragDistance >= aimThreshold) {
                this.isDraggingStone = true;
            }

            if (pointer.isDown) {
                this.stoneAim = {
                    start: carryPoint,
                    end: pointerPosition,
                };
            } else if (!pointer.justReleased) {
                this.stoneAim = null;
            }

            if (!pointer.justReleased) {
                return;
            }

            this.isPreparingStoneThrow = false;
            this.isDraggingStone = false;
            this.stoneAim = null;

            if (dragDistance < aimThreshold) {
                this.physicsController.clearStoneProjectileState();
                this.physicsController.setHeldStonePosition(carryPoint);
                return;
            }

            const throwVelocity = this.getStoneThrowVelocity(
                carryPoint,
                pointerPosition,
            );

            this.physicsController.throwStone({
                position: carryPoint,
                velocity: throwVelocity,
            });
            return;
        }

        this.isDraggingStone = false;
        this.isPreparingStoneThrow = false;
        this.stoneAim = null;
    }

    getStoneCarryPoint() {
        const bounds = this.characterModel.getBounds();
        const offsetX = bounds.width * 0.08 * this.characterModel.facing;

        return {
            x: bounds.left + bounds.width / 2 + offsetX,
            y: bounds.top - Math.max(bounds.height * 0.26, 18),
        };
    }

    getStoneThrowVelocity(carryPoint, pointerPoint) {
        const dx = pointerPoint.x - carryPoint.x;
        const dy = pointerPoint.y - carryPoint.y;
        const dragDistance = Math.sqrt(dx * dx + dy * dy);
        const strength = clamp(dragDistance, 18, 260);
        const scale = 0.11;
        const baseX = dx * scale;
        const baseY = dy * scale;
        const extraScale = strength / 155;

        return {
            x: clamp(baseX * extraScale, -22, 22),
            y: clamp(baseY * extraScale, -22, 18),
        };
    }

    getPointerDistance(startPoint, endPoint) {
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    handleProjectileTriggerHits() {
        const triggerIds = this.physicsController?.consumeTriggerHits?.() ?? [];

        triggerIds.forEach((triggerId) => {
            const collapseState = this.stageModel.activateProjectileTrigger(triggerId);

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
