import { GameController } from "./controller/GameController.js";
import { InputController } from "./controller/InputController.js";
import { CharacterModel } from "./model/CharacterModel.js";
import { StageModel } from "./model/StageModel.js";
import { GameView } from "./view/GameView.js";

function init() {
    const container = document.getElementById("game-container");
    const characterElement = container?.querySelector(".character");

    if (!container || !characterElement) {
        throw new Error("Game container or character element is missing.");
    }

    const stageModel = new StageModel(container);
    const gameView = new GameView(characterElement);
    const inputController = new InputController(window);
    const characterModel = new CharacterModel(gameView.measureCharacter());
    const gameController = new GameController({
        characterModel,
        stageModel,
        inputController,
        gameView,
    });

    gameController.start();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}
