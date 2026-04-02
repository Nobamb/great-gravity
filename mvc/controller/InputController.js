/**
 * [InputController]
 * 사용자의 키보드 입력을 감지하고 게임에서 사용할 수 있는 단순화된 시냅샷 형태로 변환해주는 클래스입니다.
 */
export class InputController {
    constructor(target = window) {
        this.target = target; // 이벤트 리스너를 붙일 대상 (기본값: window)
        // 현재 눌려 있는 키들의 상태를 저장합니다.
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
        };
        // 점프는 입력을 받는 즉시 처리하기 위해 별도 큐(Queue) 변수를 사용합니다.
        this.jumpQueued = false;

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);

        // 이벤트 등록
        this.target.addEventListener("keydown", this.boundKeyDown);
        this.target.addEventListener("keyup", this.boundKeyUp);
    }

    /**
     * 키가 눌렸을 때 실행되는 핸들러입니다.
     */
    handleKeyDown(event) {
        // 우리가 추적하지 않는 키는 무시합니다.
        if (!this.isTrackedKey(event.code)) {
            return;
        }

        // 방향키나 스페이스바가 브라우저 페이지를 스크롤하지 않도록 방지합니다.
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
                // 점프 입력은 한 번의 입력으로 간주하여 큐에 담아둡니다.
                this.jumpQueued = true;
                break;
            default:
                break;
        }
    }

    /**
     * 키에서 손을 뗐을 때 실행되는 핸들러입니다.
     */
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

    /**
     * 게임에서 사용하는 특정 키인지 확인합니다.
     */
    isTrackedKey(code) {
        return code === "ArrowLeft"
            || code === "ArrowRight"
            || code === "ArrowUp"
            || code === "ArrowDown"
            || code === "Space";
    }

    /**
     * 현재 시점의 입력 상태를 정리하여 반환합니다.
     * 방향은 0, 1, -1로 정규화되어 반환됩니다.
     * @returns {object} { horizontal, vertical, jump }
     */
    getSnapshot() {
        const snapshot = {
            horizontal: 0, // -1(왼쪽), 0(정지), 1(오른쪽)
            vertical: 0,   // -1(위), 0(정지), 1(아래)
            jump: this.jumpQueued, // 스페이스바 클릭 여부
        };

        // 수평 입력 계산
        if (this.keys.left && !this.keys.right) {
            snapshot.horizontal = -1;
        } else if (this.keys.right && !this.keys.left) {
            snapshot.horizontal = 1;
        }

        // 수직 입력 계산
        if (this.keys.up && !this.keys.down) {
            snapshot.vertical = -1;
        } else if (this.keys.down && !this.keys.up) {
            snapshot.vertical = 1;
        }

        // 다음 프레임을 위해 점프 큐를 초기화합니다.
        this.jumpQueued = false;

        return snapshot;
    }
}
