export class PhysicsController {
    constructor({ physicsModel, physicsView }) {
        this.physicsModel = physicsModel;
        this.physicsView = physicsView;
    }

    start(stageModel) {
        if (!this.physicsModel.enabled) {
            return;
        }

        this.physicsModel.initialize(stageModel);
        this.physicsView.initialize(this.physicsModel);
    }

    handleStageMutation(stageModel, { resetDynamics = false } = {}) {
        if (!this.physicsModel.enabled) {
            return;
        }

        this.physicsModel.syncStage(stageModel, { resetDynamics });
        this.physicsView.initialize(this.physicsModel);
    }

    step(dt) {
        if (!this.physicsModel.enabled) {
            return [];
        }

        this.physicsModel.step(dt);
        return this.physicsModel.getSolidifiedRects();
    }

    render() {
        if (!this.physicsModel.enabled) {
            return;
        }

        this.physicsView.render(this.physicsModel);
    }

    reset(stageModel) {
        if (!this.physicsModel.enabled) {
            return;
        }

        this.physicsModel.syncStage(stageModel, {
            resetDynamics: true,
            hardReset: true,
        });
        this.physicsView.initialize(this.physicsModel);
    }

    getSolidifiedBlocks() {
        if (!this.physicsModel.enabled) {
            return [];
        }

        return this.physicsModel.getSolidifiedRects();
    }

    getLavaHazards() {
        if (!this.physicsModel.enabled) {
            return [];
        }

        return this.physicsModel.getLavaHazards();
    }

    getTreasureBounds() {
        if (!this.physicsModel.enabled) {
            return null;
        }

        return this.physicsModel.getTreasureBounds();
    }

    getStoneBounds() {
        if (!this.physicsModel.enabled) {
            return null;
        }

        return this.physicsModel.getStoneBounds();
    }

    canPickupStone(characterBounds, padding = 0) {
        if (!this.physicsModel.enabled) {
            return false;
        }

        return this.physicsModel.canPickupStone(characterBounds, padding);
    }

    holdStoneAt(position) {
        if (!this.physicsModel.enabled) {
            return false;
        }

        return this.physicsModel.holdStoneAt(position);
    }

    throwStone({ position, velocity }) {
        if (!this.physicsModel.enabled) {
            return false;
        }

        return this.physicsModel.throwStone({ position, velocity });
    }

    consumeTriggerHits() {
        if (!this.physicsModel.enabled) {
            return [];
        }

        return this.physicsModel.consumeTriggerHits();
    }

    destroy() {
        this.physicsView?.destroy?.();
        this.physicsModel?.destroy?.();
    }
}
