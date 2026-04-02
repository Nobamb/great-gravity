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
        // 기본 물리 설정값 (단위: px, px/s)
        this.width = size.width ?? 0;
        this.height = size.height ?? 0;
        this.spawn = { x: 0, y: 0 }; // 스폰(재시작) 위치
        this.facing = 1;             // 1: 오른쪽, -1: 왼쪽

        this.maxMoveSpeed = 260;     // 최대 이동 속도
        this.groundAcceleration = 2200; // 지상 가속도
        this.airAcceleration = 1400;    // 공중 가속도
        this.groundDeceleration = 2600; // 지상 감속도
        this.airDeceleration = 600;     // 공중 감속도
        this.gravity = 1800;            // 중력 가속도
        this.maxFallSpeed = 1000;    // 최대 추락 속도
        this.jumpVelocity = -640;    // 점프 시 위쪽으로 가해지는 속도
        this.climbSpeed = 190;       // 사다리 오르기 속도
        this.fallResetMargin = 160;  // 스테이지 밖으로 얼마나 떨어졌을 때 리셋할지 (px)

        this.resetState();
    }

    /**
     * 캐릭터의 변동 가능한 상태값을 초기화합니다.
     */
    resetState() {
        this.x = 0;
        this.y = 0;
        this.vx = 0; // 수평 속도
        this.vy = 0; // 수직 속도
        this.moveIntent = 0;     // 이전 입력된 이동 방향
        this.onGround = false;   // 지면 접촉 여부
        this.onLadder = false;   // 사다리 영역 내 존재 여부
        this.isClimbing = false; // 현재 사다리를 타고 있는 상태인지 여부
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
        // 사다리 충돌 감지를 위한 여백 계산
        const ladderPadding = Math.max(8, stage.bounds.width * 0.008);
        const currentBounds = this.getBounds();
        const ladder = stage.getLadderForBounds(currentBounds, ladderPadding);

        this.moveIntent = input.horizontal;
        this.onLadder = Boolean(ladder);

        // 캐릭터가 바라보는 방향 결정
        if (input.horizontal !== 0) {
            this.facing = input.horizontal;
        }

        // 1. 사다리에서 점프하여 뛰어내리기
        if (this.isClimbing && input.jump) {
            this.isClimbing = false;
            this.onLadder = false;
            this.vy = this.jumpVelocity;
        }

        // 2. 사다리 주행 중 좌우 입력 시 사다리에서 내리기
        if (this.isClimbing && input.horizontal !== 0 && input.vertical === 0) {
            this.isClimbing = false;
            this.onLadder = false;
        }

        // 3. 사다리 근처에서 위/아래 입력 시 타기 시작
        if (!this.isClimbing && ladder && input.vertical !== 0 && !input.jump) {
            this.isClimbing = true;
            this.onGround = false;
            this.vx = 0;
            this.vy = 0;
        }

        // 상태에 따라 다른 물리 로직 적용
        if (this.isClimbing) {
            this.updateClimbing(dt, stage, input);
        } else {
            this.updatePlatforming(dt, stage, input);
        }

        // 화면 밖으로 나가지 않도록 제한 (좌우)
        this.x = clamp(this.x, 0, Math.max(0, stage.bounds.width - this.width));

        // 화면 아래로 추락 시 스폰 위치로 리셋
        if (this.y > stage.bounds.height + this.fallResetMargin) {
            this.resetToSpawn();
        }
    }

    /**
     * 일반적인 플랫폼 이동(걷기, 점프, 중력) 로직입니다.
     */
    updatePlatforming(dt, stage, input) {
        // 수평 가속/감속 처리
        if (input.horizontal !== 0) {
            const targetVelocity = input.horizontal * this.maxMoveSpeed;
            const acceleration = this.onGround ? this.groundAcceleration : this.airAcceleration;
            const maxVelocityChange = acceleration * dt;
            const velocityDelta = clamp(targetVelocity - this.vx, -maxVelocityChange, maxVelocityChange);

            this.vx += velocityDelta;
        } else {
            const deceleration = this.onGround ? this.groundDeceleration : this.airDeceleration;
            this.vx = approach(this.vx, 0, deceleration * dt);
        }

        // 지상에서 점프 처리
        if (input.jump && this.onGround) {
            this.vy = this.jumpVelocity;
            this.onGround = false;
        }

        // 중력 적용
        this.vy = Math.min(this.vy + this.gravity * dt, this.maxFallSpeed);

        // X축 이동 및 지형 충돌 해결
        this.x += this.vx * dt;
        this.resolveHorizontalCollisions(stage.solids);

        // Y축 이동 및 지형 충돌 해결
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

        // 사다리를 벗어나면 자동으로 플랫폼 상태로 전환
        if (!ladder) {
            this.isClimbing = false;
            this.onLadder = false;
            this.updatePlatforming(dt, stage, input);
            return;
        }

        this.onGround = false;
        this.onLadder = true;
        this.vx = 0;
        this.vy = input.vertical * this.climbSpeed;
        // 사다리를 탈 때는 사다리 중앙에 자석처럼 붙게 합니다.
        this.x = clamp(ladder.left + (ladder.width - this.width) / 2, 0, Math.max(0, stage.bounds.width - this.width));
        this.y += this.vy * dt;

        // 사다리 탑승 중에도 고체 지형(벽/바닥)과의 충돌은 체크합니다.
        this.resolveVerticalCollisions(stage.solids);

        // 끝까지 올랐거나 내려갔을 때 사다리 판정 재확인
        if (!stage.getLadderForBounds(this.getBounds(), ladderPadding)) {
            this.isClimbing = false;
            this.onLadder = false;
        }
    }

    /**
     * 수평 방향 지형 충돌을 체크하고 위치를 보정합니다. (벽 뚫기 방지)
     */
    resolveHorizontalCollisions(solids) {
        let bounds = this.getBounds();

        for (const solid of solids) {
            if (!intersects(bounds, solid)) {
                continue;
            }

            if (this.vx > 0) {
                // 오른쪽으로 이동 중 벽에 부딪힘
                this.x = solid.left - this.width;
            } else if (this.vx < 0) {
                // 왼쪽으로 이동 중 벽에 부딪힘
                this.x = solid.right;
            }

            this.vx = 0;
            bounds = this.getBounds();
        }
    }

    /**
     * 수직 방향 지형 충돌을 체크하고 위치를 보정합니다. (바닥 착지 및 천장 충돌)
     */
    resolveVerticalCollisions(solids) {
        let bounds = this.getBounds();

        for (const solid of solids) {
            if (!intersects(bounds, solid)) {
                continue;
            }

            if (this.vy > 0) {
                // 아래로 추락 중 바닥에 착지
                this.y = solid.top - this.height;
                this.onGround = true;
            } else if (this.vy < 0) {
                // 점프 중 천장에 부딪힘
                this.y = solid.bottom;
            }

            this.vy = 0;
            bounds = this.getBounds();
        }
    }
}
