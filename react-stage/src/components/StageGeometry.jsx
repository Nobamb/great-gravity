import BackgroundLayer from "./BackgroundLayer.jsx";
import CharacterSprite from "./CharacterSprite.jsx";
import ClearOverlay from "./ClearOverlay.jsx";
import TimerPanel from "./TimerPanel.jsx";
import TreasurePile from "./TreasurePile.jsx";
import TriggerableBlock from "./TriggerableBlock.jsx";

export default function StageGeometry({
    containerRef,
    characterRef,
    lavaRef,
    waterRef,
    treasureRef,
}) {
    return (
        <div id="game-container" ref={containerRef}>
            <BackgroundLayer />
            <TimerPanel />

            <div className="spawn-pad" data-collider="solid" data-spawn="player"></div>
            <div
                className="jump-block"
                data-collider="solid"
                data-effect="jump-boost"
            ></div>

            <div className="stone-bridge" data-collider="solid"></div>
            <div className="ladder" data-collider="ladder"></div>

            <TriggerableBlock
                className="main-support zIndex100"
                triggerPlacement="top"
                triggerId="main-support-trigger"
                triggerDirection="top"
            />

            <div className="top-beam zIndex100" data-collider="solid"></div>

            <TriggerableBlock
                className="mid-ledge zIndex100"
                triggerPlacement="left"
                triggerId="mid-ledge-trigger"
                triggerDirection="left"
            >
                <div className="goal-location" data-collider="solid"></div>
            </TriggerableBlock>

            <TreasurePile ref={treasureRef} />

            <TriggerableBlock
                className="right-frame zIndex100"
                triggerPlacement="top"
                triggerId="right-frame-trigger"
                triggerDirection="top"
            />

            <div className="lava-fall" ref={lavaRef}></div>
            <div className="ice-water" ref={waterRef}></div>
            <div className="bottom-bar zIndex100" data-collider="solid"></div>
            <div className="goal-ledge" data-collider="solid"></div>

            <CharacterSprite ref={characterRef} />
            <ClearOverlay />

            <div className="vignette"></div>
        </div>
    );
}
