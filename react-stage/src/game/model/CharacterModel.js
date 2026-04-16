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
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

function getHorizontalOverlap(a, b) {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
}

function getVerticalOverlap(a, b) {
  return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

function getSweptBounds(startBounds, endBounds) {
  return {
    left: Math.min(startBounds.left, endBounds.left),
    top: Math.min(startBounds.top, endBounds.top),
    right: Math.max(startBounds.right, endBounds.right),
    bottom: Math.max(startBounds.bottom, endBounds.bottom),
  };
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

    this.maxMoveSpeed = 260; // 최대 이동 속도
    this.groundAcceleration = 2200; // 지상 가속도
    this.airAcceleration = 1400; // 공중 가속도
    this.groundDeceleration = 2600; // 지상 감속도
    this.airDeceleration = 600; // 공중 감속도
    this.gravity = 1800; // 중력 가속도
    this.maxFallSpeed = 1000; // 최대 추락 속도
    this.jumpVelocity = -640; // 점프 속도
    this.climbSpeed = 190; // 사다리 오르기 속도
    this.fallResetMargin = 160; // 추락 리셋 여유분
    this.swimMoveSpeedMultiplier = 0.9;
    this.swimStrokeSpeedMultiplier = 0.3;
    this.swimFallSpeedMultiplier = 0.3;
    this.maxBreathTime = 5;
    this.breathRecoveryMultiplier = 5;
    this.airControlProfiles = {
      default: {
        maxMoveSpeedMultiplier: 1,
        accelerationMultiplier: 1,
        decelerationMultiplier: 1,
        preserveMomentum: false,
        minWallVerticalOverlapRatio: 0,
        minWallVerticalOverlapPx: 0,
      },
      cannon: {
        maxMoveSpeedMultiplier: 1.18,
        accelerationMultiplier: 1.85,
        decelerationMultiplier: 0.45,
        preserveMomentum: true,
        minWallVerticalOverlapRatio: 0.22,
        minWallVerticalOverlapPx: 10,
      },
    };

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
    this.isSwimming = false;
    this.swimPhase = "idle";
    this.swimTargetY = null;
    this.isHeadUnderwater = false;
    this.breathRatio = 1;
    this.groundEffect = null; // 현재 밟고 있는 지형의 특수 효과
    this.hitIceCeiling = false;
    this.airControlProfile = "default";
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

  normalizeAirControlProfile(profile) {
    return profile === "cannon" ? "cannon" : "default";
  }

  resetAirControlProfile() {
    this.airControlProfile = "default";
  }

  getAirControlSettings() {
    return (
      this.airControlProfiles[this.airControlProfile] ??
      this.airControlProfiles.default
    );
  }

  isUsingCannonAirControl() {
    return (
      this.airControlProfile === "cannon" &&
      !this.onGround &&
      !this.isClimbing &&
      !this.isSwimming
    );
  }

  getMinimumHorizontalWallOverlap(collisionEpsilon) {
    if (!this.isUsingCannonAirControl()) {
      return collisionEpsilon;
    }

    const airControlSettings = this.getAirControlSettings();

    return Math.max(
      collisionEpsilon,
      this.height * airControlSettings.minWallVerticalOverlapRatio,
      airControlSettings.minWallVerticalOverlapPx * this.physicsScale,
    );
  }

  launch({
    x = this.x,
    y = this.y,
    vx = 0,
    vy = 0,
    airControlProfile = "default",
  } = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.onGround = false;
    this.onLadder = false;
    this.isClimbing = false;
    this.isSwimming = false;
    this.swimPhase = "idle";
    this.swimTargetY = null;
    this.isHeadUnderwater = false;
    this.breathRatio = 1;
    this.groundEffect = null;
    this.hitIceCeiling = false;
    this.airControlProfile = this.normalizeAirControlProfile(airControlProfile);
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
    this.isSwimming = false;
    this.swimPhase = "idle";
    this.swimTargetY = null;
    this.isHeadUnderwater = false;
    this.breathRatio = 1;
    this.groundEffect = null;
    this.hitIceCeiling = false;
    this.airControlProfile = "default";
  }

  /**
   * 화면 리사이즈 시 캐릭터의 좌표를 비율에 맞춰 이동시킵니다.
   */
  resizeWorld(scaleX, scaleY, size) {
    this.x *= scaleX;
    this.y *= scaleY;
    this.spawn.x *= scaleX;
    this.spawn.y *= scaleY;
    if (typeof this.swimTargetY === "number") {
      this.swimTargetY *= scaleY;
    }
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

  getHeadBounds(position = {}) {
    const left = position.x ?? this.x;
    const top = position.y ?? this.y;
    const headSize = this.width * (30 / 42);
    const headTop = top - headSize * 0.5;

    return {
      left: left + (this.width - headSize) / 2,
      top: headTop,
      right: left + (this.width + headSize) / 2,
      bottom: headTop + headSize,
      width: headSize,
      height: headSize,
    };
  }

  getSwimmingWaterZone(bounds = this.getBounds(), stage) {
    const waterZone = stage.getWaterZoneForBounds?.(bounds) ?? null;

    if (!waterZone) {
      return null;
    }

    const overlapWidth =
      Math.min(bounds.right, waterZone.right) -
      Math.max(bounds.left, waterZone.left);
    const overlapHeight =
      Math.min(bounds.bottom, waterZone.bottom) -
      Math.max(bounds.top, waterZone.top);
    const overlapArea =
      Math.max(0, overlapWidth) * Math.max(0, overlapHeight);
    const bodyArea =
      Math.max(0, bounds.right - bounds.left) *
      Math.max(0, bounds.bottom - bounds.top);
    const minimumSwimArea = bodyArea * 0.5;

    if (overlapArea < minimumSwimArea) {
      return null;
    }

    return waterZone;
  }

  /**
   * 매 프레임 캐릭터의 상태를 업데이트하는 핵심 함수입니다.
   */
  update(dt, stage, input) {
    const ladderPadding = Math.max(8, stage.bounds.width * 0.008);
    const currentBounds = this.getBounds();
    const ladder = stage.getLadderForBounds(currentBounds, ladderPadding);
    const waterZone = this.getSwimmingWaterZone(currentBounds, stage);
    const isInWater = Boolean(waterZone);

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
      this.resetAirControlProfile();
      this.clearSwimmingState();
    }

    if (this.isClimbing) {
      this.updateClimbing(dt, stage, input);
    } else if (isInWater) {
      this.updateSwimming(dt, stage, input);
    } else {
      this.clearSwimmingState();
      this.updatePlatforming(dt, stage, input);
    }

    this.x = clamp(this.x, 0, Math.max(0, stage.bounds.width - this.width));

    if (this.isTouchingHazard(stage.hazards)) {
      return true;
    }

    if (this.hitIceCeiling) {
      return true;
    }

    if (this.updateBreath(dt, stage)) {
      return true;
    }

    // 추락 리셋 여유분도 배율 적용
    const resetLimit =
      stage.bounds.height + this.fallResetMargin * this.physicsScale;
    if (this.y > resetLimit) {
      return true;
    }

    return false;
  }

  clearSwimmingState() {
    this.isSwimming = false;
    this.swimPhase = "idle";
    this.swimTargetY = null;
  }

  updateBreath(dt, stage) {
    const isHeadUnderwater = Boolean(
      stage.getWaterZoneForBounds?.(this.getHeadBounds()),
    );
    const drainRate = 1 / this.maxBreathTime;
    const recoverRate = drainRate * this.breathRecoveryMultiplier;

    this.isHeadUnderwater = isHeadUnderwater;

    if (isHeadUnderwater) {
      this.breathRatio = clamp(this.breathRatio - drainRate * dt, 0, 1);
      return this.breathRatio <= 0;
    }

    this.breathRatio = clamp(this.breathRatio + recoverRate * dt, 0, 1);
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
    const groundMaxMoveSpeed = this.maxMoveSpeed * s;
    const airControlSettings = this.isUsingCannonAirControl()
      ? this.getAirControlSettings()
      : this.airControlProfiles.default;
    const airMaxMoveSpeed =
      groundMaxMoveSpeed * airControlSettings.maxMoveSpeedMultiplier;
    const groundAcceleration = this.groundAcceleration * s;
    const airAcceleration =
      this.airAcceleration * s * airControlSettings.accelerationMultiplier;
    const groundDeceleration =
      (this.groundEffect === "ice-slip"
        ? this.groundDeceleration * 0.12
        : this.groundDeceleration) * s;
    const airDeceleration =
      this.airDeceleration * s * airControlSettings.decelerationMultiplier;
    const gravity = this.gravity * s;
    const maxFallSpeed = this.maxFallSpeed * s;
    const jumpVelocity = this.jumpVelocity * s;

    // 수평 가속/감속 처리
    if (input.horizontal !== 0) {
      const targetVelocity =
        input.horizontal *
        (this.onGround ? groundMaxMoveSpeed : airMaxMoveSpeed);
      const acceleration = this.onGround ? groundAcceleration : airAcceleration;
      const isPreservingCannonMomentum =
        !this.onGround &&
        airControlSettings.preserveMomentum &&
        Math.sign(this.vx) === input.horizontal &&
        Math.abs(this.vx) > Math.abs(targetVelocity);

      if (!isPreservingCannonMomentum) {
        const maxVelocityChange = acceleration * dt;
        const velocityDelta = clamp(
          targetVelocity - this.vx,
          -maxVelocityChange,
          maxVelocityChange,
        );

        this.vx += velocityDelta;
      }
    } else {
      const deceleration = this.onGround ? groundDeceleration : airDeceleration;
      this.vx = approach(this.vx, 0, deceleration * dt);
    }

    // 지상에서 점프 처리
    if (input.jump && this.onGround) {
      // 점프 높이를 2배로 만들기 위해 점프 속도에 Math.sqrt(2)를 곱합니다.
      // (에너지 보존 법칙에 의해 높이는 속도의 제곱에 비례하기 때문입니다.)
      const jumpMultiplier =
        this.groundEffect === "jump-boost" ? Math.sqrt(2) : 1;
      this.vy = jumpVelocity * jumpMultiplier;
      this.onGround = false;
    }

    // 중력 적용
    this.vy = Math.min(this.vy + gravity * dt, maxFallSpeed);

    // X축 및 Y축 이동
    this.moveWithSubsteps(stage.solids, {
      dx: this.vx * dt,
      dy: this.vy * dt,
      resetGround: true,
      resetCollisionState: true,
    });
  }

  updateSwimming(dt, stage, input) {
    this.resetAirControlProfile();

    const s = this.physicsScale;
    const maxMoveSpeed = this.maxMoveSpeed * s * this.swimMoveSpeedMultiplier;
    const acceleration =
      this.airAcceleration * s * this.swimMoveSpeedMultiplier;
    const deceleration =
      this.airDeceleration * s * this.swimMoveSpeedMultiplier;
    const baseJumpSpeed = Math.abs(this.jumpVelocity * s);
    const swimRiseSpeed = baseJumpSpeed * this.swimStrokeSpeedMultiplier;
    const swimGravity = this.gravity * s * this.swimFallSpeedMultiplier;
    const swimMaxFallSpeed =
      this.maxFallSpeed * s * this.swimFallSpeedMultiplier;
    const jumpHeight = (baseJumpSpeed * baseJumpSpeed) / (2 * this.gravity * s);

    this.isSwimming = true;
    this.onGround = false;
    this.groundEffect = null;
    this.hitIceCeiling = false;

    if (input.horizontal !== 0) {
      const targetVelocity = input.horizontal * maxMoveSpeed;
      const maxVelocityChange = acceleration * dt;
      const velocityDelta = clamp(
        targetVelocity - this.vx,
        -maxVelocityChange,
        maxVelocityChange,
      );

      this.vx += velocityDelta;
    } else {
      this.vx = approach(this.vx, 0, deceleration * dt);
    }

    if (input.jump) {
      this.swimPhase = "rising";
      this.swimTargetY = this.y - jumpHeight;
      this.vy = -swimRiseSpeed;
    }

    if (this.swimPhase === "rising" && typeof this.swimTargetY === "number") {
      const riseDistance = swimRiseSpeed * dt;
      const targetY = this.swimTargetY;
      const travelDistance = Math.min(
        riseDistance,
        Math.max(0, this.y - targetY),
      );

      this.vy = -swimRiseSpeed;
      this.moveWithSubsteps(stage.solids, {
        dx: this.vx * dt,
        dy: -travelDistance,
        resetGround: true,
        resetCollisionState: true,
      });

      if (this.vy === 0 || this.y <= targetY) {
        this.swimPhase = "falling";
        this.swimTargetY = null;
        this.vy = 0;
      } else {
        this.vy = -swimRiseSpeed;
      }

      return;
    }

    this.swimPhase = "falling";
    this.swimTargetY = null;
    this.vy = Math.min(
      Math.max(this.vy, 0) + swimGravity * dt,
      swimMaxFallSpeed,
    );
    this.moveWithSubsteps(stage.solids, {
      dx: this.vx * dt,
      dy: this.vy * dt,
      resetGround: true,
      resetCollisionState: true,
    });
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
      if (this.getSwimmingWaterZone(this.getBounds(), stage)) {
        this.updateSwimming(dt, stage, input);
      } else {
        this.updatePlatforming(dt, stage, input);
      }
      return;
    }

    this.clearSwimmingState();
    this.onGround = false;
    this.onLadder = true;
    this.vx = 0;
    // 사다리 오르기 속도 배율 적용
    this.vy = input.vertical * this.climbSpeed * this.physicsScale;
    this.x = clamp(
      ladder.left + (ladder.width - this.width) / 2,
      0,
      Math.max(0, stage.bounds.width - this.width),
    );
    this.moveWithSubsteps(stage.solids, {
      dx: 0,
      dy: this.vy * dt,
      resetGround: true,
      resetCollisionState: true,
    });

    if (!stage.getLadderForBounds(this.getBounds(), ladderPadding)) {
      this.isClimbing = false;
      this.onLadder = false;
    }
  }

  /**
   * 수평 방향 지형 충돌을 체크하고 위치를 보정합니다.
   */
  getCollisionStepSize() {
    return Math.max(4, 4 * this.physicsScale);
  }

  getCollisionEpsilon() {
    return Math.max(2, 2 * this.physicsScale);
  }

  moveWithSubsteps(
    solids,
    {
      dx = 0,
      dy = 0,
      resetGround = false,
      resetCollisionState = false,
    } = {},
  ) {
    if (resetGround) {
      this.onGround = false;
    }

    if (resetCollisionState) {
      this.groundEffect = null;
      this.hitIceCeiling = false;
    }

    const maxDistance = Math.max(Math.abs(dx), Math.abs(dy));

    if (maxDistance === 0) {
      return;
    }

    const stepCount = Math.max(
      1,
      Math.ceil(maxDistance / this.getCollisionStepSize()),
    );
    let remainingDx = dx;
    let remainingDy = dy;

    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
      const stepsRemaining = stepCount - stepIndex;
      const stepDx = remainingDx / stepsRemaining;
      const stepDy = remainingDy / stepsRemaining;

      if (stepDx !== 0) {
        const previousHorizontalBounds = this.getBounds();
        this.x += stepDx;
        this.resolveHorizontalCollisions(solids, previousHorizontalBounds);

        if (this.vx === 0) {
          remainingDx = 0;
        } else {
          remainingDx -= stepDx;
        }
      }

      if (stepDy !== 0) {
        const previousVerticalBounds = this.getBounds();
        this.y += stepDy;
        this.resolveVerticalCollisions(solids, previousVerticalBounds);

        if (this.vy === 0) {
          remainingDy = 0;
        } else {
          remainingDy -= stepDy;
        }
      }

      if (remainingDx === 0 && remainingDy === 0) {
        break;
      }
    }
  }

  resolveHorizontalCollisions(solids, previousBounds = this.getBounds()) {
    const bounds = this.getBounds();
    const sweptBounds = getSweptBounds(previousBounds, bounds);
    const collisionEpsilon = this.getCollisionEpsilon();
    const minimumVerticalOverlap =
      this.getMinimumHorizontalWallOverlap(collisionEpsilon);
    let leftWall = null;
    let leftWallPosition = Number.POSITIVE_INFINITY;
    let rightWall = null;
    let rightWallPosition = Number.NEGATIVE_INFINITY;

    for (const solid of solids) {
      const sweptVerticalOverlap = getVerticalOverlap(sweptBounds, solid);

      if (sweptVerticalOverlap < minimumVerticalOverlap) {
        continue;
      }

      if (this.vx > 0) {
        const startedLeft =
          previousBounds.right <= solid.left + collisionEpsilon;
        const crossedLeft = bounds.right >= solid.left - collisionEpsilon;

        if (!startedLeft || !crossedLeft) {
          continue;
        }

        if (solid.left < leftWallPosition) {
          leftWallPosition = solid.left;
          leftWall = solid;
        }
      } else if (this.vx < 0) {
        const startedRight =
          previousBounds.left >= solid.right - collisionEpsilon;
        const crossedRight = bounds.left <= solid.right + collisionEpsilon;

        if (!startedRight || !crossedRight) {
          continue;
        }

        if (solid.right > rightWallPosition) {
          rightWallPosition = solid.right;
          rightWall = solid;
        }
      } else {
        continue;
      }
    }

    if (this.vx > 0 && leftWall) {
      this.x = leftWall.left - this.width;
      this.vx = 0;
      return;
    }

    if (this.vx < 0 && rightWall) {
      this.x = rightWall.right;
      this.vx = 0;
    }
  }

  /**
   * 수직 방향 지형 충돌을 체크하고 위치를 보정합니다.
   */
  resolveVerticalCollisions(solids, previousBounds = this.getBounds()) {
    const bounds = this.getBounds();
    const sweptBounds = getSweptBounds(previousBounds, bounds);
    const collisionEpsilon = this.getCollisionEpsilon();
    const minimumHorizontalOverlap = collisionEpsilon;
    let landingSolid = null;
    let landingTop = Number.POSITIVE_INFINITY;
    let ceilingSolid = null;
    let ceilingBottom = Number.NEGATIVE_INFINITY;

    for (const solid of solids) {
      const sweptHorizontalOverlap = getHorizontalOverlap(sweptBounds, solid);

      if (sweptHorizontalOverlap < minimumHorizontalOverlap) {
        continue;
      }

      if (this.vy > 0) {
        const startedAbove =
          previousBounds.bottom <= solid.top + collisionEpsilon;
        const crossedTop = bounds.bottom >= solid.top - collisionEpsilon;

        if (!startedAbove || !crossedTop) {
          continue;
        }

        if (solid.top < landingTop) {
          landingTop = solid.top;
          landingSolid = solid;
        }
      } else if (this.vy < 0) {
        const startedBelow =
          previousBounds.top >= solid.bottom - collisionEpsilon;
        const crossedBottom = bounds.top <= solid.bottom + collisionEpsilon;

        if (!startedBelow || !crossedBottom) {
          continue;
        }

        if (solid.bottom > ceilingBottom) {
          ceilingBottom = solid.bottom;
          ceilingSolid = solid;
        }
      }
    }

    if (this.vy > 0 && landingSolid) {
      this.y = landingSolid.top - this.height;
      this.vy = 0;
      this.onGround = true;
      this.groundEffect = landingSolid.effect || null;
      this.resetAirControlProfile();
      return;
    }

    if (this.vy < 0 && ceilingSolid) {
      this.y = ceilingSolid.bottom;
      this.vy = 0;

      if (ceilingSolid.elementType === "ice") {
        this.hitIceCeiling = true;
      }
    }
  }
}
