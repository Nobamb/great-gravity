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
            return;
        }

        this.physicsModel.step(dt);
    }

    render() {
        if (!this.physicsModel.enabled) {
            return;
        }

        this.physicsView.render(this.physicsModel);
    }
}
