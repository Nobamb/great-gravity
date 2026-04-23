import { getRelativePointerPosition } from "../dom/layoutMetrics.js";

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
        this.jumpQueued = false;
        this.interactQueued = false;
        this.restartHeld = false;
        this.pointerState = {
            isDown: false,
            justPressed: false,
            justReleased: false,
            startedOnCharacter: false,
            position: null,
            dragStart: null,
        };

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundMouseDown = this.handleMouseDown.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);
        this.boundBlur = this.handleBlur.bind(this);

        this.target.addEventListener("keydown", this.boundKeyDown);
        this.target.addEventListener("keyup", this.boundKeyUp);
        this.target.addEventListener("mousedown", this.boundMouseDown);
        this.target.addEventListener("mousemove", this.boundMouseMove);
        this.target.addEventListener("mouseup", this.boundMouseUp);
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
        this.restartHeld = false;
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
        }

        if (this.keys.up && !this.keys.down) {
            snapshot.vertical = -1;
        } else if (this.keys.down && !this.keys.up) {
            snapshot.vertical = 1;
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
        this.pointerState = {
            isDown: false,
            justPressed: false,
            justReleased: false,
            startedOnCharacter: false,
            position: this.pointerState.position,
            dragStart: null,
        };
    }

    destroy() {
        this.target.removeEventListener("keydown", this.boundKeyDown);
        this.target.removeEventListener("keyup", this.boundKeyUp);
        this.target.removeEventListener("mousedown", this.boundMouseDown);
        this.target.removeEventListener("mousemove", this.boundMouseMove);
        this.target.removeEventListener("mouseup", this.boundMouseUp);
        this.target.removeEventListener("blur", this.boundBlur);
    }
}
