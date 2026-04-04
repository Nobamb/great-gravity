import { useEffect, useRef } from "react";
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useNavigate,
} from "react-router-dom";
import Screen from "./components/Screen.jsx";
import StageGeometry from "./components/StageGeometry.jsx";
import { GameController } from "./game/controller/GameController.js";
import { InputController } from "./game/controller/InputController.js";
import { PhysicsController } from "./game/controller/PhysicsController.js";
import { CharacterModel } from "./game/model/CharacterModel.js";
import { PhysicsModel } from "./game/model/PhysicsModel.js";
import { StageModel } from "./game/model/StageModel.js";
import { GameView } from "./game/view/GameView.js";
import { PhysicsView } from "./game/view/PhysicsView.js";
import {
    getStagePath,
    STAGE_DEFINITIONS,
    STAGE_LIST,
} from "./stages/stageDefinitions.js";

function useGameRuntime({
    containerRef,
    characterRef,
    treasureRef,
    stage,
    nextStagePath,
    navigate,
}) {
    useEffect(() => {
        const container = containerRef.current;
        const characterElement = characterRef.current;
        const treasureElement = treasureRef.current;

        if (!container || !characterElement || !treasureElement) {
            return undefined;
        }

        const stageModel = new StageModel(container);
        const gameView = new GameView(characterElement);
        const inputController = new InputController(window);
        const characterModel = new CharacterModel(gameView.measureCharacter());
        const physicsModel = new PhysicsModel({
            container,
            treasureElement,
        });
        const physicsView = new PhysicsView({
            container,
            treasureElement,
        });
        const physicsController = new PhysicsController({
            physicsModel,
            physicsView,
        });
        const gameController = new GameController({
            stage,
            nextStagePath,
            navigate,
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
    }, [
        characterRef,
        containerRef,
        navigate,
        nextStagePath,
        stage,
        treasureRef,
    ]);
}

function StageRuntime({ stage }) {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const characterRef = useRef(null);
    const treasureRef = useRef(null);
    const nextStagePath = stage.nextStageId ? getStagePath(stage.nextStageId) : null;

    useGameRuntime({
        containerRef,
        characterRef,
        treasureRef,
        stage,
        nextStagePath,
        navigate,
    });

    return (
        <div className="app-shell">
            <Screen>
                <StageGeometry
                    stage={stage}
                    containerRef={containerRef}
                    characterRef={characterRef}
                    treasureRef={treasureRef}
                />
            </Screen>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to={STAGE_DEFINITIONS.stage1.path} replace />} />
                {STAGE_LIST.map((stage) => (
                    <Route
                        key={stage.id}
                        path={stage.path}
                        element={<StageRuntime stage={stage} />}
                    />
                ))}
                <Route path="*" element={<Navigate to={STAGE_DEFINITIONS.stage1.path} replace />} />
            </Routes>
        </BrowserRouter>
    );
}
