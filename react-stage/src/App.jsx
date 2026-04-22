import { startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useNavigate,
} from "react-router-dom";
import BgmPlayer from "./components/BgmPlayer.jsx";
import MainPage from "./components/MainPage.jsx";
import Screen from "./components/Screen.jsx";
import StageGeometry from "./components/StageGeometry.jsx";
import StageSelectPage from "./components/StageSelectPage.jsx";
import { PreferencesProvider, usePreferences } from "./contexts/PreferencesContext.jsx";
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
    LEGACY_STAGE_ROUTES,
    STAGE_LIST,
} from "./stages/stageDefinitions.js";
import {
    getProgressSnapshot,
    recordStageClear,
} from "./stages/progressStorage.js";

const RESTART_STAGE_EVENT = "great-gravity:restart-stage";

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
    onStageClearRef,
    onMainMenuRef,
}) {
    const gameControllerRef = useRef(null);

    const { isPreferencesOpen } = usePreferences();

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
            onStageClear: (payload) => onStageClearRef.current?.(payload),
            onMainMenu: () => onMainMenuRef.current?.(),
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
        onMainMenuRef,
        onStageClearRef,
        requestBossStructureRebuildRef,
        requestBossStructureFluidVisibilityRef,
        stage,
        stoneAnchorRef,
        stoneAimRef,
        stoneRef,
        treasureAnchorRef,
        treasureRef,
    ]);

    useEffect(() => {
        if (gameControllerRef.current) {
            if (isPreferencesOpen) {
                gameControllerRef.current.pause?.();
            } else {
                gameControllerRef.current.resume?.();
            }
        }
    }, [isPreferencesOpen]);

    useEffect(() => {
        const handleStageRestart = (event) => {
            if (!gameControllerRef.current) {
                return;
            }

            event.preventDefault();
            gameControllerRef.current.restartStage?.();
        };

        window.addEventListener(RESTART_STAGE_EVENT, handleStageRestart);
        return () => {
            window.removeEventListener(RESTART_STAGE_EVENT, handleStageRestart);
        };
    }, []);

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
    const onStageClearRef = useRef(null);
    const onMainMenuRef = useRef(null);
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
    onStageClearRef.current = ({ timeMs, stars, deathCount }) => {
        recordStageClear(stage.id, { timeMs, stars, deathCount });
    };
    onMainMenuRef.current = () => {
        navigate("/");
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
        onStageClearRef,
        onMainMenuRef,
    });

    return (
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
    );
}

function StageRoute({ stage }) {
    const progress = getProgressSnapshot();

    if (!progress[stage.id]?.unlocked) {
        return <Navigate to="/select" replace />;
    }

    return <StageRuntime stage={stage} />;
}

function MenuScreen({ children }) {
    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <PreferencesProvider>
                <BgmPlayer />
                <div className="app-shell">
                    <Screen>
                        <Routes>
                            <Route
                                path="/"
                                element={(
                                    <MenuScreen>
                                        <MainPage />
                                    </MenuScreen>
                                )}
                            />
                            <Route
                                path="/select"
                                element={(
                                    <MenuScreen>
                                        <StageSelectPage />
                                    </MenuScreen>
                                )}
                            />
                            {STAGE_LIST.map((stage) => (
                                <Route
                                    key={stage.id}
                                    path={stage.path}
                                    element={<StageRoute stage={stage} />}
                                />
                            ))}
                            {LEGACY_STAGE_ROUTES.map((legacyRoute) => (
                                <Route
                                    key={legacyRoute.path}
                                    path={legacyRoute.path}
                                    element={<Navigate to={legacyRoute.redirectTo} replace />}
                                />
                            ))}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Screen>
                </div>
            </PreferencesProvider>
        </BrowserRouter>
    );
}
