import { useEffect, useRef } from "react";
import { GameController } from "./game/controller/GameController.js";
import { InputController } from "./game/controller/InputController.js";
import { PhysicsController } from "./game/controller/PhysicsController.js";
import { CharacterModel } from "./game/model/CharacterModel.js";
import { PhysicsModel } from "./game/model/PhysicsModel.js";
import { StageModel } from "./game/model/StageModel.js";
import { GameView } from "./game/view/GameView.js";
import { PhysicsView } from "./game/view/PhysicsView.js";
import Screen from "./components/Screen.jsx";
import StageGeometry from "./components/StageGeometry.jsx";

function useGameRuntime({
    containerRef,
    characterRef,
    lavaRef,
    waterRef,
    treasureRef,
}) {
    useEffect(() => {
        const container = containerRef.current;
        const characterElement = characterRef.current;
        const lavaElement = lavaRef.current;
        const waterElement = waterRef.current;
        const treasureElement = treasureRef.current;

        if (
            !container ||
            !characterElement ||
            !lavaElement ||
            !waterElement ||
            !treasureElement
        ) {
            return undefined;
        }

        const stageModel = new StageModel(container);
        const gameView = new GameView(characterElement);
        const inputController = new InputController(window);
        const characterModel = new CharacterModel(gameView.measureCharacter());
        const physicsModel = new PhysicsModel({
            container,
            lavaElement,
            waterElement,
            treasureElement,
        });
        const physicsView = new PhysicsView({
            lavaElement,
            waterElement,
            treasureElement,
        });
        const physicsController = new PhysicsController({
            physicsModel,
            physicsView,
        });
        const gameController = new GameController({
            characterModel,
            stageModel,
            inputController,
            gameView,
            physicsController,
        });

        gameController.start();

        return () => {
            gameController.destroy?.();
        };
    }, [characterRef, containerRef, lavaRef, treasureRef, waterRef]);
}

export default function App() {
    const containerRef = useRef(null);
    const characterRef = useRef(null);
    const lavaRef = useRef(null);
    const waterRef = useRef(null);
    const treasureRef = useRef(null);

    useGameRuntime({
        containerRef,
        characterRef,
        lavaRef,
        waterRef,
        treasureRef,
    });

    return (
        <div className="app-shell">
            <Screen>
                <StageGeometry
                    containerRef={containerRef}
                    characterRef={characterRef}
                    lavaRef={lavaRef}
                    waterRef={waterRef}
                    treasureRef={treasureRef}
                />
            </Screen>
        </div>
    );
}
