/**
 * [InputController]
 * 사용자의 키보드 입력을 감지하고 게임에서 사용하기 쉬운 상태로 정리합니다.
 */
export class InputController {
    constructor(target = window) {
        this.target = target;
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
        };
        this.jumpQueued = false;
        this.interactQueued = false;

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);

        this.target.addEventListener("keydown", this.boundKeyDown);
        this.target.addEventListener("keyup", this.boundKeyUp);
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
            default:
                break;
        }
    }

    isTrackedKey(code) {
        return code === "ArrowLeft"
            || code === "ArrowRight"
            || code === "ArrowUp"
            || code === "ArrowDown"
            || code === "Space"
            || code === "KeyE";
    }

    /**
     * @returns {object} { horizontal, vertical, jump, interact }
     */
    getSnapshot() {
        const snapshot = {
            horizontal: 0,
            vertical: 0,
            jump: this.jumpQueued,
            interact: this.interactQueued,
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

        return snapshot;
    }
}
