import { startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
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
    heldStoneRef,
    treasureRef,
    treasureAnchorRef,
    stoneRef,
    stoneAnchorRef,
    stoneAimRef,
    stage,
    nextStagePath,
    navigate,
    bossStructureVersion,
    bossStructureFluidsVisible,
    requestBossStructureRebuildRef,
    requestBossStructureFluidVisibilityRef,
}) {
    const gameControllerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        const characterElement = characterRef.current;
        const heldStoneElement = heldStoneRef.current;
        const treasureElement = treasureRef.current;
        const treasureAnchorElement = treasureAnchorRef.current;
        const stoneElement = stoneRef.current;
        const stoneAnchorElement = stoneAnchorRef.current;
        const stoneAimElement = stoneAimRef.current;

        if (!container || !characterElement) {
            return undefined;
        }

        const stageModel = new StageModel(container);
        const gameView = new GameView(characterElement, {
            heldStoneElement,
            stoneAimElement,
        });
        const inputController = new InputController(window, {
            containerElement: container,
            characterElement,
        });
        const characterModel = new CharacterModel(gameView.measureCharacter());
        const physicsModel = new PhysicsModel({
            container,
            treasureElement,
            treasureAnchorElement,
            stoneElement,
            stoneAnchorElement,
        });
        const physicsView = new PhysicsView({
            container,
            treasureElement,
            stoneElement,
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
            requestBossStructureRebuild: () =>
                requestBossStructureRebuildRef.current?.(),
            requestBossStructureFluidVisibility: (isVisible) =>
                requestBossStructureFluidVisibilityRef.current?.(isVisible),
        });
        gameControllerRef.current = gameController;

        gameController.start();

        return () => {
            gameControllerRef.current = null;
            gameController.destroy?.();
        };
    }, [
        characterRef,
        containerRef,
        heldStoneRef,
        navigate,
        nextStagePath,
        stage,
        stoneAnchorRef,
        stoneAimRef,
        stoneRef,
        treasureRef,
        treasureAnchorRef,
        requestBossStructureRebuildRef,
        requestBossStructureFluidVisibilityRef,
    ]);

    useLayoutEffect(() => {
        if (bossStructureVersion === 0) {
            return;
        }

        gameControllerRef.current?.handleBossStructureRebuilt?.();
    }, [bossStructureVersion]);

    useLayoutEffect(() => {
        gameControllerRef.current?.handleBossStructureFluidVisibilityCommitted?.();
    }, [bossStructureFluidsVisible]);
}

function StageRuntime({ stage }) {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const characterRef = useRef(null);
    const heldStoneRef = useRef(null);
    const treasureRef = useRef(null);
    const treasureAnchorRef = useRef(null);
    const stoneRef = useRef(null);
    const stoneAnchorRef = useRef(null);
    const stoneAimRef = useRef(null);
    const requestBossStructureRebuildRef = useRef(null);
    const requestBossStructureFluidVisibilityRef = useRef(null);
    const [bossStructureVersion, setBossStructureVersion] = useState(0);
    const [bossStructureFluidsVisible, setBossStructureFluidsVisible] = useState(true);
    const nextStagePath = stage.nextStageId ? getStagePath(stage.nextStageId) : null;

    requestBossStructureRebuildRef.current = () => {
        startTransition(() => {
            setBossStructureVersion((currentVersion) => currentVersion + 1);
        });
    };
    requestBossStructureFluidVisibilityRef.current = (isVisible) => {
        setBossStructureFluidsVisible(Boolean(isVisible));
    };

    useGameRuntime({
        containerRef,
        characterRef,
        heldStoneRef,
        treasureRef,
        treasureAnchorRef,
        stoneRef,
        stoneAnchorRef,
        stoneAimRef,
        stage,
        nextStagePath,
        navigate,
        bossStructureVersion,
        bossStructureFluidsVisible,
        requestBossStructureRebuildRef,
        requestBossStructureFluidVisibilityRef,
    });

    return (
        <div className="app-shell">
            <Screen>
                <StageGeometry
                    stage={stage}
                    containerRef={containerRef}
                    characterRef={characterRef}
                    heldStoneRef={heldStoneRef}
                    treasureRef={treasureRef}
                    treasureAnchorRef={treasureAnchorRef}
                    stoneRef={stoneRef}
                    stoneAnchorRef={stoneAnchorRef}
                    stoneAimRef={stoneAimRef}
                    bossStructureVersion={bossStructureVersion}
                    bossStructureFluidsVisible={bossStructureFluidsVisible}
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
