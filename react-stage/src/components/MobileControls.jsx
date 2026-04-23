import { usePreferences } from "../contexts/PreferencesContext";

export default function MobileControls() {
    const { isMobileViewport } = usePreferences();

    if (!isMobileViewport) return null;

    const handlePointerDown = (keyCode) => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: keyCode }));
    };

    const handlePointerUp = (keyCode) => {
        window.dispatchEvent(new KeyboardEvent("keyup", { code: keyCode }));
    };

    return (
        <div className="mobile-controls">
            <div className="mobile-controls__dpad">
                <button
                    type="button"
                    className="mobile-btn mobile-btn--up"
                    onPointerDown={() => handlePointerDown("ArrowUp")}
                    onPointerUp={() => handlePointerUp("ArrowUp")}
                    onPointerLeave={() => handlePointerUp("ArrowUp")}
                    onPointerCancel={() => handlePointerUp("ArrowUp")}
                >
                    <span className="material-symbols-outlined">arrow_upward</span>
                </button>
                <div className="mobile-controls__dpad-mid">
                    <button
                        type="button"
                        className="mobile-btn mobile-btn--left"
                        onPointerDown={() => handlePointerDown("ArrowLeft")}
                        onPointerUp={() => handlePointerUp("ArrowLeft")}
                        onPointerLeave={() => handlePointerUp("ArrowLeft")}
                        onPointerCancel={() => handlePointerUp("ArrowLeft")}
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <button
                        type="button"
                        className="mobile-btn mobile-btn--right"
                        onPointerDown={() => handlePointerDown("ArrowRight")}
                        onPointerUp={() => handlePointerUp("ArrowRight")}
                        onPointerLeave={() => handlePointerUp("ArrowRight")}
                        onPointerCancel={() => handlePointerUp("ArrowRight")}
                    >
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                </div>
                <button
                    type="button"
                    className="mobile-btn mobile-btn--down"
                    onPointerDown={() => handlePointerDown("ArrowDown")}
                    onPointerUp={() => handlePointerUp("ArrowDown")}
                    onPointerLeave={() => handlePointerUp("ArrowDown")}
                    onPointerCancel={() => handlePointerUp("ArrowDown")}
                >
                    <span className="material-symbols-outlined">arrow_downward</span>
                </button>
            </div>

            <div className="mobile-controls__actions">
                <button
                    type="button"
                    className="mobile-btn mobile-btn--action mobile-btn--r"
                    onPointerDown={() => handlePointerDown("KeyR")}
                    onPointerUp={() => handlePointerUp("KeyR")}
                    onPointerLeave={() => handlePointerUp("KeyR")}
                    onPointerCancel={() => handlePointerUp("KeyR")}
                >
                    <span>R</span>
                </button>
                <button
                    type="button"
                    className="mobile-btn mobile-btn--action mobile-btn--e"
                    onPointerDown={() => handlePointerDown("KeyE")}
                    onPointerUp={() => handlePointerUp("KeyE")}
                    onPointerLeave={() => handlePointerUp("KeyE")}
                    onPointerCancel={() => handlePointerUp("KeyE")}
                >
                    <span>E</span>
                </button>
                <button
                    type="button"
                    className="mobile-btn mobile-btn--action mobile-btn--jump"
                    onPointerDown={() => handlePointerDown("Space")}
                    onPointerUp={() => handlePointerUp("Space")}
                    onPointerLeave={() => handlePointerUp("Space")}
                    onPointerCancel={() => handlePointerUp("Space")}
                >
                    <span className="material-symbols-outlined">upload</span>
                </button>
            </div>
        </div>
    );
}
