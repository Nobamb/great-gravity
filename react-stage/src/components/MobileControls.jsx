import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePreferences } from "../contexts/PreferencesContext";

const MOBILE_JOYSTICK_EVENT = "great-gravity:mobile-joystick";
const JOYSTICK_DEAD_ZONE = 0.28;
const JOYSTICK_MAX_OFFSET = 44;

function dispatchJoystickInput(horizontal = 0, vertical = 0) {
    window.dispatchEvent(new CustomEvent(MOBILE_JOYSTICK_EVENT, {
        detail: { horizontal, vertical },
    }));
}

export default function MobileControls() {
    const {
        isMobileViewport,
        isPreferencesOpen,
        isLandscapeScreen,
        isViewportLandscape,
    } = usePreferences();
    const joystickRef = useRef(null);
    const activeTouchIdRef = useRef(null);
    const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
    const [isClearOverlayVisible, setIsClearOverlayVisible] = useState(false);
    const isRotatedLandscapeControls = isLandscapeScreen && !isViewportLandscape;

    useEffect(() => () => {
        dispatchJoystickInput(0, 0);
    }, []);

    useEffect(() => {
        if (typeof document === "undefined") {
            return undefined;
        }

        const clearOverlay = document.querySelector(".clear-overlay");

        if (!clearOverlay) {
            return undefined;
        }

        const syncClearOverlayVisibility = () => {
            setIsClearOverlayVisible(!clearOverlay.hidden);
        };
        const observer = new MutationObserver(syncClearOverlayVisibility);

        syncClearOverlayVisibility();
        observer.observe(clearOverlay, {
            attributes: true,
            attributeFilter: ["hidden"],
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    const stopControlEvent = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handlePointerDown = (event, keyCode) => {
        stopControlEvent(event);
        window.dispatchEvent(new KeyboardEvent("keydown", { code: keyCode }));
    };

    const handlePointerUp = (event, keyCode) => {
        stopControlEvent(event);
        window.dispatchEvent(new KeyboardEvent("keyup", { code: keyCode }));
    };

    const resetJoystick = () => {
        activeTouchIdRef.current = null;
        setStickOffset({ x: 0, y: 0 });
        dispatchJoystickInput(0, 0);
    };

    useEffect(() => {
        if (!isMobileViewport || isPreferencesOpen || isClearOverlayVisible) {
            resetJoystick();
        }
    }, [isMobileViewport, isPreferencesOpen, isClearOverlayVisible]);

    const getTrackedTouch = (touchList) => {
        const activeTouchId = activeTouchIdRef.current;

        if (activeTouchId === null) {
            return touchList[0] ?? null;
        }

        return Array.from(touchList).find((touch) => touch.identifier === activeTouchId) ?? null;
    };

    const updateJoystick = (touch) => {
        const joystickElement = joystickRef.current;

        if (!joystickElement || !touch) {
            return;
        }

        const rect = joystickElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const rawX = touch.clientX - centerX;
        const rawY = touch.clientY - centerY;
        const distance = Math.hypot(rawX, rawY);
        const maxOffset = Math.min(rect.width, rect.height) * 0.5 - 20;
        const safeMaxOffset = Math.max(24, Math.min(maxOffset, JOYSTICK_MAX_OFFSET));
        const scale = distance > safeMaxOffset ? safeMaxOffset / distance : 1;
        const x = (isRotatedLandscapeControls ? rawY : rawX) * scale;
        const y = (isRotatedLandscapeControls ? -rawX : rawY) * scale;
        const normalizedX = x / safeMaxOffset;
        const normalizedY = y / safeMaxOffset;
        const horizontal =
            Math.abs(normalizedX) >= JOYSTICK_DEAD_ZONE ? Math.sign(normalizedX) : 0;
        const vertical =
            Math.abs(normalizedY) >= JOYSTICK_DEAD_ZONE ? Math.sign(normalizedY) : 0;

        setStickOffset({ x, y });
        dispatchJoystickInput(horizontal, vertical);
    };

    const handleJoystickTouchStart = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (activeTouchIdRef.current !== null) {
            return;
        }

        const touch = event.changedTouches[0];

        if (!touch) {
            return;
        }

        activeTouchIdRef.current = touch.identifier;
        updateJoystick(touch);
    };

    const handleJoystickTouchMove = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const touch = getTrackedTouch(event.changedTouches);

        if (!touch) {
            return;
        }

        updateJoystick(touch);
    };

    const handleJoystickTouchEnd = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const touch = getTrackedTouch(event.changedTouches);

        if (!touch) {
            return;
        }

        resetJoystick();
    };

    if (
        !isMobileViewport ||
        isPreferencesOpen ||
        isClearOverlayVisible ||
        typeof document === "undefined"
    ) return null;

    const controls = (
        <div
            className={[
                "mobile-controls",
                isRotatedLandscapeControls ? "mobile-controls--rotated" : "",
            ].filter(Boolean).join(" ")}
        >
            <div
                className="mobile-controls__dpad"
                ref={joystickRef}
                onTouchStart={handleJoystickTouchStart}
                onTouchMove={handleJoystickTouchMove}
                onTouchEnd={handleJoystickTouchEnd}
                onTouchCancel={handleJoystickTouchEnd}
                aria-label="Movement joystick"
                role="application"
            >
                <div
                    className="mobile-controls__joystick-stick"
                    style={{
                        transform: `translate3d(${stickOffset.x}px, ${stickOffset.y}px, 0)`,
                    }}
                ></div>
            </div>

            <div className="mobile-controls__actions">
                <button
                    type="button"
                    className="mobile-btn mobile-btn--action mobile-btn--r"
                    onPointerDown={(event) => handlePointerDown(event, "KeyR")}
                    onPointerUp={(event) => handlePointerUp(event, "KeyR")}
                    onPointerLeave={(event) => handlePointerUp(event, "KeyR")}
                    onPointerCancel={(event) => handlePointerUp(event, "KeyR")}
                >
                    <span>R</span>
                </button>
                <button
                    type="button"
                    className="mobile-btn mobile-btn--action mobile-btn--e"
                    onPointerDown={(event) => handlePointerDown(event, "KeyE")}
                    onPointerUp={(event) => handlePointerUp(event, "KeyE")}
                    onPointerLeave={(event) => handlePointerUp(event, "KeyE")}
                    onPointerCancel={(event) => handlePointerUp(event, "KeyE")}
                >
                    <span>E</span>
                </button>
                <button
                    type="button"
                    className="mobile-btn mobile-btn--action mobile-btn--jump"
                    onPointerDown={(event) => handlePointerDown(event, "Space")}
                    onPointerUp={(event) => handlePointerUp(event, "Space")}
                    onPointerLeave={(event) => handlePointerUp(event, "Space")}
                    onPointerCancel={(event) => handlePointerUp(event, "Space")}
                >
                    <span className="material-symbols-outlined">upload</span>
                </button>
            </div>
        </div>
    );

    return createPortal(controls, document.body);
}
