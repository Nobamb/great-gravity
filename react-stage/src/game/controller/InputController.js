import { getRelativePointerPosition } from "../dom/layoutMetrics.js";

const MOBILE_JOYSTICK_EVENT = "great-gravity:mobile-joystick";

/**
 * [InputController]
 * 사용자의 키보드 입력을 감지하고 게임에서 사용하기 쉬운 상태로 정리합니다.
 */
export class InputController {
    constructor(
        target = window,
        { containerElement = null, characterElement = null } = {},
    ) {
        this.target = target;
        this.containerElement = containerElement;
        this.characterElement = characterElement;
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
        };
        this.mobileJoystick = {
            horizontal: 0,
            vertical: 0,
        };
        this.jumpQueued = false;
        this.interactQueued = false;
        this.restartHeld = false;
        this.activeTouchId = null;
        this.pointerState = {
            isDown: false,
            justPressed: false,
            justReleased: false,
            startedOnCharacter: false,
            inputType: null,
            position: null,
            dragStart: null,
        };

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundMobileJoystick = this.handleMobileJoystick.bind(this);
        this.boundMouseDown = this.handleMouseDown.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);
        this.boundTouchStart = this.handleTouchStart.bind(this);
        this.boundTouchMove = this.handleTouchMove.bind(this);
        this.boundTouchEnd = this.handleTouchEnd.bind(this);
        this.boundTouchCancel = this.handleTouchCancel.bind(this);
        this.boundBlur = this.handleBlur.bind(this);

        this.target.addEventListener("keydown", this.boundKeyDown);
        this.target.addEventListener("keyup", this.boundKeyUp);
        this.target.addEventListener(MOBILE_JOYSTICK_EVENT, this.boundMobileJoystick);
        this.target.addEventListener("mousedown", this.boundMouseDown);
        this.target.addEventListener("mousemove", this.boundMouseMove);
        this.target.addEventListener("mouseup", this.boundMouseUp);
        this.target.addEventListener("touchstart", this.boundTouchStart, { passive: false });
        this.target.addEventListener("touchmove", this.boundTouchMove, { passive: false });
        this.target.addEventListener("touchend", this.boundTouchEnd, { passive: false });
        this.target.addEventListener("touchcancel", this.boundTouchCancel, { passive: false });
        this.target.addEventListener("blur", this.boundBlur);
    }

    handleKeyDown(event) {
        if (!this.isTrackedKey(event.code)) {
            return;
        }

        event.preventDefault();

        switch (event.code) {
            case "ArrowLeft":
                this.keys.left = true;
                break;
            case "ArrowRight":
                this.keys.right = true;
                break;
            case "ArrowUp":
                this.keys.up = true;
                break;
            case "ArrowDown":
                this.keys.down = true;
                break;
            case "Space":
                this.jumpQueued = true;
                break;
            case "KeyE":
                this.interactQueued = true;
                break;
            case "KeyR":
                this.restartHeld = true;
                break;
            default:
                break;
        }
    }

    handleKeyUp(event) {
        if (!this.isTrackedKey(event.code)) {
            return;
        }

        event.preventDefault();

        switch (event.code) {
            case "ArrowLeft":
                this.keys.left = false;
                break;
            case "ArrowRight":
                this.keys.right = false;
                break;
            case "ArrowUp":
                this.keys.up = false;
                break;
            case "ArrowDown":
                this.keys.down = false;
                break;
            case "KeyR":
                this.restartHeld = false;
                break;
            default:
                break;
        }
    }

    handleBlur() {
        this.keys.left = false;
        this.keys.right = false;
        this.keys.up = false;
        this.keys.down = false;
        this.mobileJoystick.horizontal = 0;
        this.mobileJoystick.vertical = 0;
        this.restartHeld = false;
        this.activeTouchId = null;
        this.resetTransientActions();
    }

    isTrackedKey(code) {
        return code === "ArrowLeft"
            || code === "ArrowRight"
            || code === "ArrowUp"
            || code === "ArrowDown"
            || code === "Space"
            || code === "KeyE"
            || code === "KeyR";
    }

    getPointerPosition(event) {
        if (!this.containerElement) {
            return null;
        }

        return getRelativePointerPosition(event, this.containerElement);
    }

    handleMobileJoystick(event) {
        const detail = event.detail ?? {};
        const horizontal = Number(detail.horizontal) || 0;
        const vertical = Number(detail.vertical) || 0;

        this.mobileJoystick.horizontal = Math.sign(horizontal);
        this.mobileJoystick.vertical = Math.sign(vertical);
    }

    shouldIgnoreTouchEvent(event) {
        const target = event.target;

        if (!target?.closest) {
            return false;
        }

        return Boolean(target.closest(".mobile-controls"));
    }

    getTouchById(touchList, touchId) {
        return Array.from(touchList).find((touch) => touch.identifier === touchId) ?? null;
    }

    getTrackedTouch(touchList) {
        if (this.activeTouchId === null) {
            return null;
        }

        return this.getTouchById(touchList, this.activeTouchId);
    }

    preventTouchDefault(event) {
        if (event.cancelable) {
            event.preventDefault();
        }
    }

    handleMouseDown(event) {
        if (event.button !== 0) {
            return;
        }

        const position = this.getPointerPosition(event);

        if (!position) {
            return;
        }

        this.pointerState.isDown = true;
        this.pointerState.justPressed = true;
        this.pointerState.justReleased = false;
        this.pointerState.inputType = "mouse";
        this.pointerState.position = position;
        this.pointerState.dragStart = position;
        this.pointerState.startedOnCharacter =
            this.characterElement?.contains(event.target) ?? false;

        if (this.pointerState.startedOnCharacter) {
            event.preventDefault();
        }
    }

    handleMouseMove(event) {
        const position = this.getPointerPosition(event);

        if (!position) {
            return;
        }

        this.pointerState.position = position;
    }

    handleMouseUp(event) {
        if (event.button !== 0) {
            return;
        }

        const position = this.getPointerPosition(event);

        if (position) {
            this.pointerState.position = position;
        }

        this.pointerState.isDown = false;
        this.pointerState.justReleased = true;
        this.pointerState.inputType = "mouse";
    }

    handleTouchStart(event) {
        if (
            this.activeTouchId !== null ||
            this.shouldIgnoreTouchEvent(event) ||
            !this.containerElement?.contains(event.target)
        ) {
            return;
        }

        const touch = event.changedTouches[0];
        const position = this.getPointerPosition(touch);

        if (!touch || !position) {
            return;
        }

        this.activeTouchId = touch.identifier;
        this.pointerState.isDown = true;
        this.pointerState.justPressed = true;
        this.pointerState.justReleased = false;
        this.pointerState.inputType = "touch";
        this.pointerState.position = position;
        this.pointerState.dragStart = position;
        this.pointerState.startedOnCharacter =
            this.characterElement?.contains(event.target) ?? false;

        if (this.pointerState.startedOnCharacter) {
            this.preventTouchDefault(event);
        }
    }

    handleTouchMove(event) {
        const touch = this.getTrackedTouch(event.changedTouches);

        if (!touch) {
            return;
        }

        const position = this.getPointerPosition(touch);

        if (!position) {
            return;
        }

        this.pointerState.position = position;
        this.preventTouchDefault(event);
    }

    handleTouchEnd(event) {
        const touch = this.getTrackedTouch(event.changedTouches);

        if (!touch) {
            return;
        }

        const position = this.getPointerPosition(touch);

        if (position) {
            this.pointerState.position = position;
        }

        this.activeTouchId = null;
        this.pointerState.isDown = false;
        this.pointerState.justReleased = true;
        this.pointerState.inputType = "touch";
        this.preventTouchDefault(event);
    }

    handleTouchCancel(event) {
        const touch = this.getTrackedTouch(event.changedTouches);

        if (!touch) {
            return;
        }

        this.activeTouchId = null;
        this.pointerState.isDown = false;
        this.pointerState.justPressed = false;
        this.pointerState.justReleased = false;
        this.pointerState.startedOnCharacter = false;
        this.pointerState.dragStart = null;
        this.pointerState.inputType = null;
        this.preventTouchDefault(event);
    }

    /**
     * @returns {object} { horizontal, vertical, jump, interact, restartHeld }
     */
    getSnapshot() {
        const pointerSnapshot = {
            isDown: this.pointerState.isDown,
            justPressed: this.pointerState.justPressed,
            justReleased: this.pointerState.justReleased,
            startedOnCharacter: this.pointerState.startedOnCharacter,
            inputType: this.pointerState.inputType,
            position: this.pointerState.position
                ? { ...this.pointerState.position }
                : null,
            dragStart: this.pointerState.dragStart
                ? { ...this.pointerState.dragStart }
                : null,
        };
        const snapshot = {
            horizontal: 0,
            vertical: 0,
            jump: this.jumpQueued,
            interact: this.interactQueued,
            restartHeld: this.restartHeld,
            pointer: pointerSnapshot,
        };

        if (this.keys.left && !this.keys.right) {
            snapshot.horizontal = -1;
        } else if (this.keys.right && !this.keys.left) {
            snapshot.horizontal = 1;
        } else if (this.mobileJoystick.horizontal !== 0) {
            snapshot.horizontal = this.mobileJoystick.horizontal;
        }

        if (this.keys.up && !this.keys.down) {
            snapshot.vertical = -1;
        } else if (this.keys.down && !this.keys.up) {
            snapshot.vertical = 1;
        } else if (this.mobileJoystick.vertical !== 0) {
            snapshot.vertical = this.mobileJoystick.vertical;
        }

        this.jumpQueued = false;
        this.interactQueued = false;
        this.pointerState.justPressed = false;
        this.pointerState.justReleased = false;

        if (!this.pointerState.isDown) {
            this.pointerState.startedOnCharacter = false;
            this.pointerState.dragStart = null;
        }

        return snapshot;
    }

    resetTransientActions() {
        this.jumpQueued = false;
        this.interactQueued = false;
        this.restartHeld = false;
        this.activeTouchId = null;
        this.pointerState = {
            isDown: false,
            justPressed: false,
            justReleased: false,
            startedOnCharacter: false,
            inputType: null,
            position: this.pointerState.position,
            dragStart: null,
        };
    }

    destroy() {
        this.target.removeEventListener("keydown", this.boundKeyDown);
        this.target.removeEventListener("keyup", this.boundKeyUp);
        this.target.removeEventListener(MOBILE_JOYSTICK_EVENT, this.boundMobileJoystick);
        this.target.removeEventListener("mousedown", this.boundMouseDown);
        this.target.removeEventListener("mousemove", this.boundMouseMove);
        this.target.removeEventListener("mouseup", this.boundMouseUp);
        this.target.removeEventListener("touchstart", this.boundTouchStart);
        this.target.removeEventListener("touchmove", this.boundTouchMove);
        this.target.removeEventListener("touchend", this.boundTouchEnd);
        this.target.removeEventListener("touchcancel", this.boundTouchCancel);
        this.target.removeEventListener("blur", this.boundBlur);
    }
}
