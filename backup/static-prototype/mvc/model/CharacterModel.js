/**
 * 수치 범위를 제한하는 헬퍼 함수입니다.
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * 현재 값에서 목표 값까지 설정된 양만큼 부드럽게 접근하는 헬퍼 함수입니다.
 * 가속도 및 감속도 계산에 사용됩니다.
 */
function approach(value, target, amount) {
    if (value < target) {
        return Math.min(value + amount, target);
    }
    if (value > target) {
        return Math.max(value - amount, target);
    }
    return target;
}

/**
 * 두 사각형 영역(A, B)이 겹치는지 확인하는 충돌 감지 함수입니다.
 */
function intersects(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * [CharacterModel]
 * 캐릭터의 위치, 속도, 물리법칙 및 상태를 관리하는 데이터 모델 클래스입니다.
 */
export class CharacterModel {
    constructor(size = {}) {
        // 기준 해상도 (1280px). 이 너비일 때 물리 배율은 1.0이 됩니다.
        this.baseWidth = 1280;
        // 현재 화면 너비에 따른 물리 배율
        this.physicsScale = 1;

        // 기본 물리 설정값 (기준 해상도 1280px 기준)
        this.width = size.width ?? 0;
        this.height = size.height ?? 0;
        this.spawn = { x: 0, y: 0 };
        this.facing = 1;

        this.maxMoveSpeed = 260;        // 최대 이동 속도
        this.groundAcceleration = 2200; // 지상 가속도
        this.airAcceleration = 1400;    // 공중 가속도
        this.groundDeceleration = 2600; // 지상 감속도
        this.airDeceleration = 600;     // 공중 감속도
        this.gravity = 1800;            // 중력 가속도
        this.maxFallSpeed = 1000;       // 최대 추락 속도
        this.jumpVelocity = -640;       // 점프 속도
        this.climbSpeed = 190;          // 사다리 오르기 속도
        this.fallResetMargin = 160;     // 추락 리셋 여유분

        this.resetState();
    }

    /**
     * 캐릭터의 변동 가능한 상태값을 초기화합니다.
     */
    resetState() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.moveIntent = 0;
        this.onGround = false;
        this.onLadder = false;
        this.isClimbing = false;
        this.groundEffect = null; // 현재 밟고 있는 지형의 특수 효과
    }

    /**
     * 화면 너비에 따라 물리 배율을 업데이트합니다.
     * @param {number} stageWidth 현재 스테이지의 너비
     */
    syncPhysics(stageWidth) {
        if (stageWidth > 0) {
            this.physicsScale = stageWidth / this.baseWidth;
        }
    }

    /**
     * 화면 크기나 모델 변경 시 캐릭터 크기를 동기화합니다.
     */
    syncSize(size) {
        if (typeof size.width === "number" && size.width > 0) {
            this.width = size.width;
        }
        if (typeof size.height === "number" && size.height > 0) {
            this.height = size.height;
        }
    }

    /**
     * 부활할 위치를 업데이트합니다.
     */
    updateSpawn(spawn) {
        this.spawn = {
            x: spawn.x,
            y: spawn.y,
        };
    }

    /**
     * 설전된 스폰 위치로 캐릭터를 즉시 이동시킵니다.
     */
    resetToSpawn() {
        this.x = this.spawn.x;
        this.y = this.spawn.y;
        this.vx = 0;
        this.vy = 0;
        this.moveIntent = 0;
        this.onGround = false;
        this.onLadder = false;
        this.isClimbing = false;
    }

    /**
     * 화면 리사이즈 시 캐릭터의 좌표를 비율에 맞춰 이동시킵니다.
     */
    resizeWorld(scaleX, scaleY, size) {
        this.x *= scaleX;
        this.y *= scaleY;
        this.spawn.x *= scaleX;
        this.spawn.y *= scaleY;
        this.syncSize(size);
    }

    /**
     * 캐릭터의 히트박스(범위) 정보를 반환합니다.
     */
    getBounds(position = {}) {
        const left = position.x ?? this.x;
        const top = position.y ?? this.y;

        return {
            left,
            top,
            right: left + this.width,
            bottom: top + this.height,
        };
    }

    /**
     * 매 프레임 캐릭터의 상태를 업데이트하는 핵심 함수입니다.
     */
    update(dt, stage, input) {
        const ladderPadding = Math.max(8, stage.bounds.width * 0.008);
        const currentBounds = this.getBounds();
        const ladder = stage.getLadderForBounds(currentBounds, ladderPadding);

        this.moveIntent = input.horizontal;
        this.onLadder = Boolean(ladder);

        if (input.horizontal !== 0) {
            this.facing = input.horizontal;
        }

        if (this.isClimbing && input.jump) {
            this.isClimbing = false;
            this.onLadder = false;
            // 배율이 적용된 점프 속도 사용
            this.vy = this.jumpVelocity * this.physicsScale;
        }

        if (this.isClimbing && input.horizontal !== 0 && input.vertical === 0) {
            this.isClimbing = false;
            this.onLadder = false;
        }

        if (!this.isClimbing && ladder && input.vertical !== 0 && !input.jump) {
            this.isClimbing = true;
            this.onGround = false;
            this.vx = 0;
            this.vy = 0;
        }

        if (this.isClimbing) {
            this.updateClimbing(dt, stage, input);
        } else {
            this.updatePlatforming(dt, stage, input);
        }

        this.x = clamp(this.x, 0, Math.max(0, stage.bounds.width - this.width));

        if (this.isTouchingHazard(stage.hazards)) {
            return true;
        }

        // 추락 리셋 여유분도 배율 적용
        const resetLimit = stage.bounds.height + (this.fallResetMargin * this.physicsScale);
        if (this.y > resetLimit) {
            return true;
        }

        return false;
    }

    isTouchingHazard(hazards = []) {
        const bounds = this.getBounds();

        return hazards.some((hazard) => intersects(bounds, hazard));
    }

    /**
     * 일반적인 플랫폼 이동(걷기, 점프, 중력) 로직입니다.
     */
    updatePlatforming(dt, stage, input) {
        // 모든 물리 상수의 배율 적용
        const s = this.physicsScale;
        const maxMoveSpeed = this.maxMoveSpeed * s;
        const groundAcceleration = this.groundAcceleration * s;
        const airAcceleration = this.airAcceleration * s;
        const groundDeceleration = this.groundDeceleration * s;
        const airDeceleration = this.airDeceleration * s;
        const gravity = this.gravity * s;
        const maxFallSpeed = this.maxFallSpeed * s;
        const jumpVelocity = this.jumpVelocity * s;

        // 수평 가속/감속 처리
        if (input.horizontal !== 0) {
            const targetVelocity = input.horizontal * maxMoveSpeed;
            const acceleration = this.onGround ? groundAcceleration : airAcceleration;
            const maxVelocityChange = acceleration * dt;
            const velocityDelta = clamp(targetVelocity - this.vx, -maxVelocityChange, maxVelocityChange);

            this.vx += velocityDelta;
        } else {
            const deceleration = this.onGround ? groundDeceleration : airDeceleration;
            this.vx = approach(this.vx, 0, deceleration * dt);
        }

        // 지상에서 점프 처리
        if (input.jump && this.onGround) {
            // 점프 높이를 2배로 만들기 위해 점프 속도에 Math.sqrt(2)를 곱합니다.
            // (에너지 보존 법칙에 의해 높이는 속도의 제곱에 비례하기 때문입니다.)
            const jumpMultiplier = this.groundEffect === "jump-boost" ? Math.sqrt(2) : 1;
            this.vy = jumpVelocity * jumpMultiplier;
            this.onGround = false;
        }

        // 중력 적용
        this.vy = Math.min(this.vy + gravity * dt, maxFallSpeed);

        // X축 및 Y축 이동
        this.x += this.vx * dt;
        this.resolveHorizontalCollisions(stage.solids);

        this.onGround = false;
        this.y += this.vy * dt;
        this.resolveVerticalCollisions(stage.solids);
    }

    /**
     * 사다리를 타고 있을 때의 이동 로직입니다.
     */
    updateClimbing(dt, stage, input) {
        const ladderPadding = Math.max(6, stage.bounds.width * 0.006);
        const ladder = stage.getLadderForBounds(this.getBounds(), ladderPadding);

        if (!ladder) {
            this.isClimbing = false;
            this.onLadder = false;
            this.updatePlatforming(dt, stage, input);
            return;
        }

        this.onGround = false;
        this.onLadder = true;
        this.vx = 0;
        // 사다리 오르기 속도 배율 적용
        this.vy = input.vertical * this.climbSpeed * this.physicsScale;
        this.x = clamp(ladder.left + (ladder.width - this.width) / 2, 0, Math.max(0, stage.bounds.width - this.width));
        this.y += this.vy * dt;

        this.resolveVerticalCollisions(stage.solids);

        if (!stage.getLadderForBounds(this.getBounds(), ladderPadding)) {
            this.isClimbing = false;
            this.onLadder = false;
        }
    }

    /**
     * 수평 방향 지형 충돌을 체크하고 위치를 보정합니다.
     */
    resolveHorizontalCollisions(solids) {
        let bounds = this.getBounds();

        for (const solid of solids) {
            if (!intersects(bounds, solid)) {
                continue;
            }

            if (this.vx > 0) {
                this.x = solid.left - this.width;
            } else if (this.vx < 0) {
                this.x = solid.right;
            }

            this.vx = 0;
            bounds = this.getBounds();
        }
    }

    /**
     * 수직 방향 지형 충돌을 체크하고 위치를 보정합니다.
     */
    resolveVerticalCollisions(solids) {
        let bounds = this.getBounds();
        this.groundEffect = null;

        for (const solid of solids) {
            if (!intersects(bounds, solid)) {
                continue;
            }

            if (this.vy > 0) {
                this.y = solid.top - this.height;
                this.onGround = true;
                this.groundEffect = solid.effect;
            } else if (this.vy < 0) {
                this.y = solid.bottom;
            }

            this.vy = 0;
            bounds = this.getBounds();
        }
    }
}
