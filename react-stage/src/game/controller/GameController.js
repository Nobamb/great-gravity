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

function createNeutralInput(input) {
    return {
        ...input,
        horizontal: 0,
        vertical: 0,
        jump: false,
        interact: false,
    };
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
        this.activeCannon = null;
        this.isAimingCannon = false;
        this.timedBlockStates = new Map();
        this.monsterStates = new Map();
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
        this.gameView.refreshStageAnchors?.();
        this.initializeStageActors();
        this.elapsedTimeMs = 0;
        this.isStageCleared = false;
        this.isDraggingStone = false;
        this.isPreparingStoneThrow = false;
        this.stoneAim = null;
        this.activeCannon = null;
        this.isAimingCannon = false;
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
        this.gameView.render(this.characterModel, this.getRenderState());

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

    initializeStageActors() {
        this.timedBlockStates = new Map(
            this.stageModel.timedBlocks.map((timedBlock) => [
                timedBlock.id,
                {
                    id: timedBlock.id,
                    startTimeMs: null,
                    isActive: false,
                    isExpired: timedBlock.isCollapsed,
                },
            ]),
        );

        this.monsterStates = new Map(
            this.stageModel.monsters.map((monster) => [
                monster.id,
                {
                    id: monster.id,
                    spawnX: monster.rect.left,
                    spawnY: monster.rect.top,
                    x: monster.rect.left,
                    y: monster.rect.top,
                    width: monster.rect.width,
                    height: monster.rect.height,
                    direction: monster.direction,
                    defaultDirection: monster.direction,
                    isAlert: false,
                    isDead: false,
                },
            ]),
        );
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
                ...this.getRenderState(),
                activeTriggerElement: null,
                canThrowStone: false,
                heldStone: null,
                stoneAim: null,
            });
            this.frameHandle = window.requestAnimationFrame(this.tick);
            return;
        }

        while (this.accumulator >= this.fixedDeltaTime) {
            const input = this.inputController.getSnapshot();
            this.beginCannonAimIfNeeded(input);

            let didDie = false;

            if (this.isAimingCannon) {
                this.holdCharacterAtActiveCannon();
            } else {
                const movementInput = this.activeCannon
                    ? createNeutralInput(input)
                    : input;
                didDie = this.characterModel.update(
                    this.fixedDeltaTime,
                    this.stageModel,
                    movementInput,
                );
            }

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

            this.handleTimedBlocks();
            this.handleStoneAutoPickup();
            this.handleTriggerInteraction(input);

            if (this.isAimingCannon) {
                this.handleCannonInteraction(input);
            } else {
                this.handleStoneInteraction(input);
            }

            this.physicsController?.step(this.fixedDeltaTime);
            this.handleProjectileTriggerHits();
            this.syncPhysicsRuntimeState();
            this.handleContactTriggerHits();
            this.updateMonsters(this.fixedDeltaTime);

            if (this.isCharacterTouchingMonster()) {
                this.handlePlayerDeath();
                this.accumulator = 0;
                break;
            }

            if (this.isTreasureCollected()) {
                this.handleStageClear();
                this.accumulator = 0;
                break;
            }

            this.accumulator -= this.fixedDeltaTime;
        }

        this.gameView.updateTimer(this.formatTime(this.elapsedTimeMs));

        if (this.isStageCleared) {
            this.physicsController?.render();
            this.gameView.render(this.characterModel, {
                ...this.getRenderState(),
                activeTriggerElement: null,
                heldStone: null,
                stoneAim: null,
            });
            this.frameHandle = window.requestAnimationFrame(this.tick);
            return;
        }

        this.updateActiveTrigger();
        this.physicsController?.render();
        this.gameView.render(this.characterModel, this.getRenderState());

        this.frameHandle = window.requestAnimationFrame(this.tick);
    }

    getRenderState() {
        return {
            activeTriggerElement: this.isAimingCannon
                ? null
                : this.activeTrigger?.element ?? null,
            canThrowStone: !this.isAimingCannon && this.canThrowStone(),
            isDraggingStone: this.isDraggingStone || this.isAimingCannon,
            stoneState: this.getStoneState(),
            heldStone: this.getHeldStoneInteraction(),
            stoneAim: this.stoneAim,
            timedBlocks: this.getTimedBlockRenderState(),
            monsters: this.getMonsterRenderState(),
            cannonState: this.getCannonRenderState(),
        };
    }

    getTimedBlockRenderState() {
        return [...this.timedBlockStates.values()].map((timedBlock) => {
            let progress = timedBlock.isExpired ? 1 : 0;

            if (timedBlock.isActive && timedBlock.startTimeMs !== null) {
                progress = clamp(
                    (this.elapsedTimeMs - timedBlock.startTimeMs) / 5000,
                    0,
                    1,
                );
            }

            return {
                id: timedBlock.id,
                progress,
                isActive: timedBlock.isActive && !timedBlock.isExpired,
            };
        });
    }

    getMonsterRenderState() {
        return [...this.monsterStates.values()].map((monster) => ({
            id: monster.id,
            x: monster.x,
            y: monster.y,
            direction: monster.direction,
            isAlert: monster.isAlert,
            isDead: monster.isDead,
        }));
    }

    getCannonRenderState() {
        if (!this.activeCannon) {
            return null;
        }

        return {
            id: this.activeCannon.id,
            isAiming: this.isAimingCannon,
        };
    }

    handleStageResize(stageState) {
        if (!stageState.changed) {
            return;
        }

        const characterSize = this.gameView.measureCharacter();
        this.characterModel.syncPhysics(stageState.width);
        this.characterModel.resizeWorld(stageState.scaleX, stageState.scaleY, characterSize);
        this.characterModel.updateSpawn(this.stageModel.getSpawnPoint(characterSize));
        this.gameView.refreshStageAnchors?.();
        this.scaleMonsterStates(stageState.scaleX, stageState.scaleY);
        this.updateActiveTrigger();
    }

    scaleMonsterStates(scaleX, scaleY) {
        this.monsterStates.forEach((monster) => {
            monster.spawnX *= scaleX;
            monster.spawnY *= scaleY;
            monster.x *= scaleX;
            monster.y *= scaleY;
            monster.width *= scaleX;
            monster.height *= scaleY;
        });
    }

    updateActiveTrigger() {
        const interactionPadding = Math.max(18, this.stageModel.bounds.width * 0.02);
        this.activeTrigger = this.stageModel.getInteractableTrigger(
            this.characterModel.getBounds(),
            interactionPadding,
        );
    }

    handleTriggerInteraction(input) {
        if (this.isAimingCannon) {
            this.activeTrigger = null;
            return;
        }

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

    handleTimedBlocks() {
        const timedBlock = this.stageModel.getStandingTimedBlock(
            this.characterModel.getBounds(),
            Math.max(8, this.stageModel.bounds.width * 0.007),
        );

        if (timedBlock) {
            const timedState = this.timedBlockStates.get(timedBlock.id);

            if (timedState && !timedState.isExpired && timedState.startTimeMs === null) {
                timedState.startTimeMs = this.elapsedTimeMs;
                timedState.isActive = true;
            }
        }

        this.timedBlockStates.forEach((timedState) => {
            if (
                timedState.isExpired ||
                timedState.startTimeMs === null ||
                !timedState.isActive
            ) {
                return;
            }

            if (this.elapsedTimeMs - timedState.startTimeMs < 5000) {
                return;
            }

            timedState.isActive = false;
            timedState.isExpired = true;
            const collapseState = this.stageModel.expireTimedBlock(timedState.id);

            if (collapseState) {
                this.gameView.animateTriggerResult(collapseState);
            }
        });
    }

    beginCannonAimIfNeeded(input) {
        if (
            this.isAimingCannon ||
            !input.pointer?.justPressed ||
            this.getStoneState() === "held"
        ) {
            return;
        }

        const interactionPadding = Math.max(26, this.stageModel.bounds.width * 0.025);
        const cannon = this.stageModel.getNearbyCannon(
            this.characterModel.getBounds(),
            interactionPadding,
        );

        if (!cannon) {
            return;
        }

        this.activeCannon = cannon;
        this.isAimingCannon = true;
        this.isDraggingStone = false;
        this.isPreparingStoneThrow = false;
        this.stoneAim = {
            start: cannon.muzzlePoint,
            end: input.pointer.position ?? cannon.muzzlePoint,
        };
        this.holdCharacterAtActiveCannon();
    }

    holdCharacterAtActiveCannon() {
        if (!this.activeCannon) {
            return;
        }

        const seat = this.activeCannon.seatPoint;
        this.characterModel.launch({
            x: seat.x - this.characterModel.width / 2,
            y: seat.y - this.characterModel.height / 2,
            vx: 0,
            vy: 0,
        });
    }

    handleCannonInteraction(input) {
        if (!this.activeCannon) {
            this.isAimingCannon = false;
            return;
        }

        const pointer = input.pointer;
        const aimThreshold = Math.max(42, this.stageModel.bounds.width * 0.035);
        const pointerPosition = pointer?.position ?? this.activeCannon.muzzlePoint;

        this.holdCharacterAtActiveCannon();
        this.stoneAim = {
            start: this.activeCannon.muzzlePoint,
            end: pointerPosition,
        };

        if (!pointer?.justReleased) {
            return;
        }

        const dragDistance = this.getPointerDistance(
            pointer.dragStart ?? pointerPosition,
            pointerPosition,
        );
        const muzzlePoint = this.activeCannon.muzzlePoint;

        this.isAimingCannon = false;
        this.stoneAim = null;

        if (dragDistance < aimThreshold) {
            this.activeCannon = null;
            return;
        }

        const velocity = this.getCannonLaunchVelocity(muzzlePoint, pointerPosition);
        this.characterModel.launch({
            x: muzzlePoint.x - this.characterModel.width / 2,
            y: muzzlePoint.y - this.characterModel.height / 2,
            vx: velocity.x,
            vy: velocity.y,
        });
        this.activeCannon = null;
    }

    getCannonLaunchVelocity(muzzlePoint, pointerPoint) {
        const dx = pointerPoint.x - muzzlePoint.x;
        const dy = pointerPoint.y - muzzlePoint.y;
        const dragDistance = Math.sqrt(dx * dx + dy * dy);
        const strength = clamp(dragDistance, 30, 420);
        const baseScale = 0.18;
        const strengthScale = strength / 140;

        return {
            x: clamp(dx * baseScale * strengthScale, -38, 38),
            y: clamp(dy * baseScale * strengthScale, -42, 28),
        };
    }

    handleContactTriggerHits() {
        const characterBounds = this.characterModel.getBounds();
        const stoneBounds = this.physicsController?.getStoneBounds?.() ?? null;

        this.stageModel.contactTriggers.forEach((trigger) => {
            if (trigger.isUsed) {
                return;
            }

            const sources = trigger.contactSources.length > 0
                ? trigger.contactSources
                : ["character"];
            const touchedByCharacter =
                sources.includes("character") && intersects(characterBounds, trigger.rect);
            const touchedByStone =
                stoneBounds &&
                sources.includes("stone") &&
                intersects(stoneBounds, trigger.rect);
            const touchedByLava =
                sources.includes("lava") &&
                this.stageModel.hazards.some((hazard) => intersects(hazard, trigger.rect));

            if (!touchedByCharacter && !touchedByStone && !touchedByLava) {
                return;
            }

            const collapseState = this.stageModel.activateContactTrigger(trigger.id);

            if (!collapseState) {
                return;
            }

            this.gameView.animateTriggerResult(collapseState);
        });
    }

    updateMonsters(dt) {
        const characterBounds = this.characterModel.getBounds();
        const speed = this.stageModel.bounds.width * 0.135;

        this.monsterStates.forEach((monster) => {
            if (monster.isDead) {
                return;
            }

            const monsterBounds = this.getMonsterBounds(monster);

            if (this.isRectTouchingLava(monsterBounds)) {
                monster.isDead = true;
                monster.isAlert = false;
                return;
            }

            const characterCenterX =
                (characterBounds.left + characterBounds.right) / 2;
            const characterCenterY =
                (characterBounds.top + characterBounds.bottom) / 2;
            const monsterCenterX = monster.x + monster.width / 2;
            const monsterCenterY = monster.y + monster.height / 2;
            const horizontalDistance = Math.abs(characterCenterX - monsterCenterX);
            const samePlatform =
                Math.abs(characterCenterY - monsterCenterY) <=
                Math.max(monster.height * 0.55, characterBounds.bottom - characterBounds.top);
            const canSeeCharacter =
                samePlatform &&
                horizontalDistance <= this.stageModel.bounds.width * 0.28 &&
                !this.isSightBlocked(monsterCenterX, characterCenterX, monsterCenterY, monster.id);

            monster.isAlert = canSeeCharacter;

            if (!canSeeCharacter) {
                return;
            }

            monster.direction = characterCenterX < monsterCenterX ? -1 : 1;
            this.moveMonster(monster, monster.direction * speed * dt);
        });
    }

    moveMonster(monster, dx) {
        const nextX = monster.x + dx;
        const nextBounds = {
            left: nextX,
            top: monster.y,
            right: nextX + monster.width,
            bottom: monster.y + monster.height,
        };

        for (const solid of this.stageModel.solids) {
            if (!intersects(nextBounds, solid)) {
                continue;
            }

            if (dx > 0) {
                monster.x = solid.left - monster.width;
            } else if (dx < 0) {
                monster.x = solid.right;
            }

            return;
        }

        monster.x = clamp(
            nextX,
            0,
            Math.max(0, this.stageModel.bounds.width - monster.width),
        );
    }

    isSightBlocked(startX, endX, y, monsterId) {
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);

        return this.stageModel.solids.some((solid) => {
            if (solid.bottom <= y || solid.top >= y) {
                return false;
            }

            const overlapsLine = !(solid.right <= minX || solid.left >= maxX);

            if (!overlapsLine) {
                return false;
            }

            // Ignore the monster's own standing platform if the line only clips the top edge.
            return true;
        });
    }

    getMonsterBounds(monster) {
        return {
            left: monster.x,
            top: monster.y,
            right: monster.x + monster.width,
            bottom: monster.y + monster.height,
        };
    }

    isCharacterTouchingMonster() {
        const characterBounds = this.characterModel.getBounds();

        return [...this.monsterStates.values()].some((monster) => (
            !monster.isDead && intersects(characterBounds, this.getMonsterBounds(monster))
        ));
    }

    isRectTouchingLava(bounds) {
        return this.stageModel.hazards.some((hazard) => intersects(bounds, hazard));
    }

    handlePlayerDeath() {
        this.isDraggingStone = false;
        this.isPreparingStoneThrow = false;
        this.stoneAim = null;
        this.activeCannon = null;
        this.isAimingCannon = false;
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
        this.gameView.refreshStageAnchors?.();
        this.initializeStageActors();

        this.physicsController?.reset(this.stageModel);
        this.syncPhysicsRuntimeState();
        this.elapsedTimeMs = 0;
        this.isStageCleared = false;
        this.isDraggingStone = false;
        this.isPreparingStoneThrow = false;
        this.stoneAim = null;
        this.activeCannon = null;
        this.isAimingCannon = false;
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
        this.activeCannon = null;
        this.isAimingCannon = false;
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
        if (this.isAimingCannon) {
            return;
        }

        const stoneState = this.getStoneState();

        if (stoneState === "held" || stoneState === "thrown") {
            return;
        }

        const pickupPadding = Math.max(12, this.stageModel.bounds.width * 0.012);
        const source = this.stageModel.getOverlappingStoneSource(
            this.characterModel.getBounds(),
            pickupPadding,
        );

        if (source) {
            const carryPoint = this.getStoneCarryPoint();
            this.stageModel.consumeStoneSource(source.id);
            this.physicsController.pickupStone(carryPoint);
            this.physicsController.setHeldStonePosition(carryPoint);
            this.isDraggingStone = false;
            this.isPreparingStoneThrow = false;
            this.stoneAim = null;
            return;
        }

        if (stoneState !== "grounded") {
            return;
        }

        const canPickup = this.physicsController?.canPickupStone?.(
            this.characterModel.getBounds(),
            pickupPadding,
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
        const viewOrigin = this.gameView?.getStoneAimOrigin?.();

        if (viewOrigin) {
            return viewOrigin;
        }

        const bounds = this.characterModel.getBounds();
        const offsetX = bounds.width * 0.04 * this.characterModel.facing;

        return {
            x: bounds.left + bounds.width / 2 + offsetX,
            y: bounds.top - Math.max(bounds.height * 0.38, 24),
        };
    }

    getStoneThrowVelocity(carryPoint, pointerPoint) {
        const dx = pointerPoint.x - carryPoint.x;
        const dy = pointerPoint.y - carryPoint.y;
        const dragDistance = Math.sqrt(dx * dx + dy * dy);
        const strength = clamp(dragDistance, 24, 280);
        const scale = 0.12;
        const baseX = dx * scale;
        const baseY = dy * scale;
        const extraScale = strength / 150;

        return {
            x: clamp(baseX * extraScale, -24, 24),
            y: clamp(baseY * extraScale, -24, 20),
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
