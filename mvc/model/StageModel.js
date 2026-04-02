/**
 * 컨테이너 내에서의 상대적인 사각형 좌표를 계산합니다.
 */
function createRelativeRect(elementRect, containerRect) {
    const left = elementRect.left - containerRect.left;
    const top = elementRect.top - containerRect.top;

    return {
        left,
        top,
        width: elementRect.width,
        height: elementRect.height,
        right: left + elementRect.width,
        bottom: top + elementRect.height,
    };
}

/**
 * 두 사각형 영역이 겹치는 넓이를 계산합니다.
 */
function getOverlapArea(a, b) {
    const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

    if (overlapX <= 0 || overlapY <= 0) {
        return 0;
    }

    return overlapX * overlapY;
}

/**
 * [StageModel]
 * 화면의 지형(바닥, 사다리, 스폰 지점) 데이터를 HTML DOM에서 읽어오고 관리하는 클래스입니다.
 */
export class StageModel {
    constructor(container) {
        this.container = container; // 게임 스테이지 DOM 컨테이너

        // 특정 목적을 가진 요소들을 찾기 위한 셀렉터 정의 (data 속성 사용)
        this.solidSelector = '[data-collider="solid"]';
        this.ladderSelector = '[data-collider="ladder"]';
        this.spawnSelector = '[data-spawn="player"]';

        this.solids = [];  // 고체 지형(벽, 바닥) 목록
        this.ladders = []; // 사다리 지형 목록
        this.bounds = {    // 스테이지 전체 크기
            width: 0,
            height: 0,
        };
        this.dirty = true; // 데이터 갱신이 필요한지 여부

        this.markDirty = this.markDirty.bind(this);
        this.refresh = this.refresh.bind(this);

        // ResizeObserver를 사용하여 스테이지 크기 변경을 감지합니다.
        if (typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver(this.markDirty);
            this.resizeObserver.observe(this.container);
        } else {
            this.resizeObserver = null;
        }

        // 창 크기 조절 시에도 갱신을 예약합니다.
        window.addEventListener("resize", this.markDirty);
    }

    /**
     * 스테이지 데이터가 변경되어 다시 계산해야 함을 표시합니다.
     */
    markDirty() {
        this.dirty = true;
    }

    /**
     * 스테이지 데이터를 최신 상태로 갱신합니다.
     * DOM 요소를 다시 스캔하고 좌표를 재계산합니다.
     * @returns {object|null} 변경된 경우 상태 정보를, 변경되지 않은 경우 null을 반환합니다.
     */
    refresh() {
        if (!this.dirty) {
            return null;
        }

        this.dirty = false;

        const previousWidth = this.bounds.width;
        const previousHeight = this.bounds.height;
        const containerRect = this.container.getBoundingClientRect();

        this.containerRect = containerRect;
        this.bounds = {
            width: containerRect.width,
            height: containerRect.height,
        };

        // 지면/벽 요소 탐색 후 상대 좌표 변환
        this.solids = Array.from(this.container.querySelectorAll(this.solidSelector)).map((element) => {
            const rect = createRelativeRect(element.getBoundingClientRect(), containerRect);
            return {
                ...rect,
                effect: element.dataset.effect || null,
            };
        });

        // 사다리 요소 탐색 후 상대 좌표 변환
        this.ladders = Array.from(this.container.querySelectorAll(this.ladderSelector)).map((element) => {
            return createRelativeRect(element.getBoundingClientRect(), containerRect);
        });

        return {
            width: this.bounds.width,
            height: this.bounds.height,
            // 이전 크기와 달라졌는지 확인
            changed: previousWidth > 0
                && previousHeight > 0
                && (previousWidth !== this.bounds.width || previousHeight !== this.bounds.height),
            // 리사이즈 시 캐릭터 위치 보정을 위한 배율 계산
            scaleX: previousWidth > 0 ? this.bounds.width / previousWidth : 1,
            scaleY: previousHeight > 0 ? this.bounds.height / previousHeight : 1,
        };
    }

    /**
     * 특정 캐릭터 크기에 맞는 스폰 지점 좌표를 계산합니다.
     * @param {object} characterSize { width, height }
     */
    getSpawnPoint(characterSize) {
        const spawnElement = this.container.querySelector(this.spawnSelector);

        if (!spawnElement) {
            return { x: 0, y: 0 };
        }

        const spawnRect = createRelativeRect(spawnElement.getBoundingClientRect(), this.containerRect);

        return {
            // 스폰 영역의 하단 중앙에 캐릭터가 위치하도록 계산
            x: spawnRect.left + (spawnRect.width - characterSize.width) / 2,
            y: spawnRect.top - characterSize.height,
        };
    }

    /**
     * 주어진 범위와 가장 많이 겹치는 사다리를 찾아 반환합니다.
     * @param {object} bounds 측정할 범위
     * @param {number} horizontalPadding 사다리 감지를 돕기 위한 좌우 여백
     */
    getLadderForBounds(bounds, horizontalPadding = 0) {
        const expandedBounds = {
            left: bounds.left - horizontalPadding,
            top: bounds.top,
            right: bounds.right + horizontalPadding,
            bottom: bounds.bottom,
        };

        let bestMatch = null;
        let bestArea = 0;

        for (const ladder of this.ladders) {
            const overlapArea = getOverlapArea(expandedBounds, ladder);

            if (overlapArea > bestArea) {
                bestArea = overlapArea;
                bestMatch = ladder;
            }
        }

        return bestMatch;
    }
}
