const MAX_FLUID_PARTICLES = 128;
const MAX_OBSTACLES = 64;

class FluidSurfaceRenderer {
    /**
     * @param {HTMLElement} containerElement - 게임 컨테이너 요소 (#game-container)
     * @param {string} variant - "lava" 또는 "water"
     */
    constructor(containerElement, variant) {
        this.containerElement = containerElement;
        this.variant = variant;
        this.canvas = document.createElement("canvas");
        this.canvas.className = `physics-fluid-canvas physics-fluid-canvas--${variant}`;
        // 캔버스를 게임 컨테이너에 배치 (전체 화면 렌더링)
        this.containerElement.appendChild(this.canvas);

        this.gl = this.canvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
        });
        this.ctx2d = null;

        this.ready = false;

        if (!this.gl) {
            this.ctx2d = this.canvas.getContext("2d");
            this.ready = Boolean(this.ctx2d);
            return;
        }

        this.program = this.createProgram();
        if (!this.program) {
            this.ctx2d = this.canvas.getContext("2d");
            this.ready = Boolean(this.ctx2d);
            return;
        }

        this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
        this.resolutionLocation = this.gl.getUniformLocation(this.program, "u_resolution");
        this.timeLocation = this.gl.getUniformLocation(this.program, "u_time");
        this.countLocation = this.gl.getUniformLocation(this.program, "u_count");
        this.pointsLocation = this.gl.getUniformLocation(this.program, "u_points[0]");
        this.variantLocation = this.gl.getUniformLocation(this.program, "u_variant");
        this.clipRectLocation = this.gl.getUniformLocation(this.program, "u_clipRect");
        this.obstacleCountLocation = this.gl.getUniformLocation(this.program, "u_obstacleCount");
        this.obstaclesLocation = this.gl.getUniformLocation(this.program, "u_obstacles[0]");

        this.buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array([
                -1, -1,
                1, -1,
                -1, 1,
                -1, 1,
                1, -1,
                1, 1,
            ]),
            this.gl.STATIC_DRAW,
        );

        this.ready = true;
    }

    resize() {
        if (!this.ready) {
            return;
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(this.containerElement.clientWidth * dpr));
        const height = Math.max(1, Math.round(this.containerElement.clientHeight * dpr));

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;

            if (this.gl && this.program) {
                this.gl.viewport(0, 0, width, height);
            }
        }
    }

    getVariantValue() {
        switch (this.variant) {
            case "lava":
                return 1;
            case "fire":
                return 2;
            case "ice-water":
                return 3;
            case "super-lava":
                return 4;
            case "water":
            default:
                return 0;
        }
    }

    render(particles, obstacles, clipRect, time) {
        if (!this.ready) {
            return false;
        }

        if (!this.gl || !this.program) {
            return this.render2D(particles, obstacles, clipRect);
        }

        this.resize();
        const scaleX = this.canvas.width / Math.max(this.containerElement.clientWidth, 1);
        const scaleY = this.canvas.height / Math.max(this.containerElement.clientHeight, 1);
        const radiusScale = Math.min(scaleX, scaleY);

        const packedParticles = new Float32Array(MAX_FLUID_PARTICLES * 3);
        const particleCount = Math.min(particles.length, MAX_FLUID_PARTICLES);
        for (let index = 0; index < particleCount; index += 1) {
            const particle = particles[index];
            packedParticles[(index * 3)] = particle.x * scaleX;
            packedParticles[(index * 3) + 1] = particle.y * scaleY;
            packedParticles[(index * 3) + 2] = particle.radius * radiusScale;
        }

        const packedObstacles = new Float32Array(MAX_OBSTACLES * 4);
        const obstacleCount = Math.min(obstacles.length, MAX_OBSTACLES);
        for (let index = 0; index < obstacleCount; index += 1) {
            const obstacle = obstacles[index];
            packedObstacles[(index * 4)] = obstacle.x * scaleX;
            packedObstacles[(index * 4) + 1] = obstacle.y * scaleY;
            packedObstacles[(index * 4) + 2] = obstacle.width * scaleX;
            packedObstacles[(index * 4) + 3] = obstacle.height * scaleY;
        }

        this.gl.useProgram(this.program);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.timeLocation, time);
        this.gl.uniform1i(this.countLocation, particleCount);
        this.gl.uniform3fv(this.pointsLocation, packedParticles);
        this.gl.uniform1f(this.variantLocation, this.getVariantValue());
        this.gl.uniform4f(
            this.clipRectLocation,
            (clipRect?.left ?? 0) * scaleX,
            (clipRect?.top ?? 0) * scaleY,
            (clipRect?.width ?? this.containerElement.clientWidth) * scaleX,
            (clipRect?.height ?? this.containerElement.clientHeight) * scaleY,
        );
        this.gl.uniform1i(this.obstacleCountLocation, obstacleCount);
        this.gl.uniform4fv(this.obstaclesLocation, packedObstacles);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        return true;
    }

    render2D(particles, obstacles, clipRect) {
        if (!this.ctx2d) {
            return false;
        }

        this.resize();

        const ctx = this.ctx2d;
        const scaleX = this.canvas.width / Math.max(this.containerElement.clientWidth, 1);
        const scaleY = this.canvas.height / Math.max(this.containerElement.clientHeight, 1);
        const radiusScale = Math.min(scaleX, scaleY);
        const clipLeft = (clipRect?.left ?? 0) * scaleX;
        const clipTop = (clipRect?.top ?? 0) * scaleY;
        const clipWidth =
            (clipRect?.width ?? this.containerElement.clientWidth) * scaleX;
        const clipHeight =
            (clipRect?.height ?? this.containerElement.clientHeight) * scaleY;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save();
        ctx.beginPath();
        ctx.rect(clipLeft, clipTop, clipWidth, clipHeight);
        ctx.clip();
        ctx.fillStyle = this.variant === "lava"
            ? "rgba(255, 116, 36, 0.9)"
            : this.variant === "fire"
                ? "rgba(255, 94, 24, 0.9)"
                : this.variant === "ice-water"
                    ? "rgba(180, 242, 255, 0.9)"
                    : this.variant === "super-lava"
                        ? "rgba(210, 34, 12, 0.94)"
                        : "rgba(78, 178, 255, 0.88)";
        ctx.beginPath();

        particles.forEach((particle) => {
            const px = particle.x * scaleX;
            const py = particle.y * scaleY;
            const radius = particle.radius * radiusScale * 0.96;
            ctx.moveTo(px + radius, py);
            ctx.arc(px, py, radius, 0, Math.PI * 2);
        });

        ctx.fill();
        ctx.globalCompositeOperation = "source-atop";

        const gradient = ctx.createLinearGradient(
            clipLeft,
            clipTop,
            clipLeft,
            clipTop + clipHeight,
        );

        if (this.variant === "lava") {
            gradient.addColorStop(0, "rgba(255, 214, 132, 0.96)");
            gradient.addColorStop(0.4, "rgba(255, 122, 44, 0.98)");
            gradient.addColorStop(1, "rgba(142, 28, 16, 0.98)");
        } else if (this.variant === "fire") {
            gradient.addColorStop(0, "rgba(255, 245, 166, 0.98)");
            gradient.addColorStop(0.42, "rgba(255, 154, 38, 0.98)");
            gradient.addColorStop(1, "rgba(216, 46, 8, 0.98)");
        } else if (this.variant === "ice-water") {
            gradient.addColorStop(0, "rgba(244, 254, 255, 0.98)");
            gradient.addColorStop(0.45, "rgba(162, 232, 255, 0.96)");
            gradient.addColorStop(1, "rgba(59, 139, 228, 0.98)");
        } else if (this.variant === "super-lava") {
            gradient.addColorStop(0, "rgba(255, 231, 162, 0.98)");
            gradient.addColorStop(0.32, "rgba(255, 86, 28, 0.99)");
            gradient.addColorStop(1, "rgba(52, 4, 2, 0.99)");
        } else {
            gradient.addColorStop(0, "rgba(224, 248, 255, 0.96)");
            gradient.addColorStop(0.45, "rgba(96, 195, 255, 0.94)");
            gradient.addColorStop(1, "rgba(31, 83, 201, 0.96)");
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(clipLeft, clipTop, clipWidth, clipHeight);

        if (obstacles.length > 0) {
            ctx.globalCompositeOperation = "destination-out";
            obstacles.forEach((obstacle) => {
                ctx.fillRect(
                    obstacle.x * scaleX,
                    obstacle.y * scaleY,
                    obstacle.width * scaleX,
                    obstacle.height * scaleY,
                );
            });
        }

        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
        return true;
    }

    createProgram() {
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, `
            attribute vec2 a_position;
            varying vec2 v_uv;

            void main() {
                v_uv = (a_position + 1.0) * 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, `
            precision mediump float;

            const int MAX_PARTICLES = ${MAX_FLUID_PARTICLES};
            const int MAX_OBSTACLES = ${MAX_OBSTACLES};

            varying vec2 v_uv;

            uniform vec2 u_resolution;
            uniform float u_time;
            uniform int u_count;
            uniform vec3 u_points[MAX_PARTICLES];
            uniform float u_variant;
            uniform vec4 u_clipRect;
            uniform int u_obstacleCount;
            uniform vec4 u_obstacles[MAX_OBSTACLES];

            float hash(vec2 point) {
                return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
            }

            float noise(vec2 point) {
                vec2 i = floor(point);
                vec2 f = fract(point);
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }

            void main() {
                vec2 pixel = vec2(v_uv.x, 1.0 - v_uv.y) * u_resolution;
                vec2 clipMin = u_clipRect.xy;
                vec2 clipMax = u_clipRect.xy + u_clipRect.zw;

                if (
                    pixel.x < clipMin.x ||
                    pixel.x > clipMax.x ||
                    pixel.y < clipMin.y ||
                    pixel.y > clipMax.y
                ) {
                    discard;
                }

                float field = 0.0;
                float nearestObstacle = 99999.0;

                for (int index = 0; index < MAX_PARTICLES; index += 1) {
                    if (index >= u_count) {
                        break;
                    }

                    vec3 point = u_points[index];
                    vec2 delta = pixel - point.xy;
                    float distanceSquared = max(dot(delta, delta), 1.0);
                    float influence = 1.18;
                    if (u_variant > 3.5) {
                        influence = 1.38;
                    } else if (u_variant > 2.5) {
                        influence = 1.2;
                    } else if (u_variant > 1.5) {
                        influence = 1.1;
                    } else if (u_variant > 0.5) {
                        influence = 1.32;
                    }
                    field += (point.z * point.z * influence) / distanceSquared;
                }

                for (int index = 0; index < MAX_OBSTACLES; index += 1) {
                    if (index >= u_obstacleCount) {
                        break;
                    }

                    vec4 obstacle = u_obstacles[index];
                    vec2 minCorner = obstacle.xy;
                    vec2 maxCorner = obstacle.xy + obstacle.zw;
                    vec2 inside = step(minCorner, pixel) * step(pixel, maxCorner);

                    if (inside.x * inside.y > 0.5) {
                        discard;
                    }

                    vec2 outsideDistance = max(max(minCorner - pixel, vec2(0.0)), pixel - maxCorner);
                    nearestObstacle = min(nearestObstacle, length(outsideDistance));
                }

                // 블록 근처에서 유체 표면을 타이트하게 조여 블록 밖으로 넘치지 않게 함
                float obstacleTightening = smoothstep(0.0, 12.0, nearestObstacle);
                float threshold = 1.08 + ((1.0 - obstacleTightening) * 0.58);
                if (u_variant > 3.5) {
                    threshold = 1.3 + ((1.0 - obstacleTightening) * 0.52);
                } else if (u_variant > 2.5) {
                    threshold = 1.12 + ((1.0 - obstacleTightening) * 0.56);
                } else if (u_variant > 1.5) {
                    threshold = 1.02 + ((1.0 - obstacleTightening) * 0.5);
                } else if (u_variant > 0.5) {
                    threshold = 1.26 + ((1.0 - obstacleTightening) * 0.58);
                }
                float body = smoothstep(threshold - 0.08, threshold + 0.015, field);

                if (body <= 0.01) {
                    discard;
                }

                float rim = smoothstep(threshold, threshold + 0.42, field);
                vec3 color;
                float alpha;

                if (u_variant < 0.5) {
                    float spread = smoothstep(0.0, 1.0, v_uv.x);
                    float wave = sin((v_uv.x * 9.0) - (u_time * 3.2) + (v_uv.y * 5.0)) * 0.06;
                    float highlight = smoothstep(0.58, 1.0, v_uv.y + wave + (rim * 0.12));
                    color = mix(vec3(0.13, 0.40, 0.87), vec3(0.47, 0.86, 1.0), v_uv.y + 0.14 + wave);
                    color += vec3(0.10, 0.18, 0.26) * spread * 0.14;
                    color += vec3(0.84, 0.97, 1.0) * highlight * 0.34;
                    alpha = body * 0.9;
                } else if (u_variant < 1.5) {
                    float flow = noise((pixel / u_resolution.xy) * vec2(4.0, 7.0) + vec2(u_time * 0.18, -u_time * 0.08));
                    float embers = noise((pixel / u_resolution.xy) * vec2(10.0, 14.0) + vec2(-u_time * 0.12, u_time * 0.05));
                    float glow = smoothstep(0.45, 1.0, flow + (rim * 0.26));
                    color = mix(vec3(0.46, 0.07, 0.04), vec3(0.94, 0.32, 0.10), flow + 0.12);
                    color = mix(color, vec3(1.0, 0.74, 0.28), glow * 0.55);
                    color += vec3(0.82, 0.22, 0.05) * smoothstep(0.74, 1.0, embers) * 0.18;
                    alpha = body * 0.96;
                } else if (u_variant < 2.5) {
                    float flicker = noise((pixel / u_resolution.xy) * vec2(12.0, 18.0) + vec2(u_time * 0.32, -u_time * 0.26));
                    float glow = smoothstep(0.38, 1.0, flicker + (rim * 0.32));
                    color = mix(vec3(0.92, 0.22, 0.02), vec3(1.0, 0.72, 0.08), glow);
                    color += vec3(1.0, 0.98, 0.68) * smoothstep(0.78, 1.0, flicker) * 0.34;
                    alpha = body * 0.92;
                } else if (u_variant < 3.5) {
                    float flow = sin((v_uv.x * 8.0) - (u_time * 2.4) + (v_uv.y * 6.0)) * 0.05;
                    float glow = smoothstep(0.52, 1.0, v_uv.y + flow + (rim * 0.1));
                    color = mix(vec3(0.20, 0.46, 0.88), vec3(0.72, 0.96, 1.0), v_uv.y + 0.18 + flow);
                    color += vec3(0.92, 1.0, 1.0) * glow * 0.28;
                    alpha = body * 0.9;
                } else {
                    float flow = noise((pixel / u_resolution.xy) * vec2(5.0, 8.5) + vec2(u_time * 0.24, -u_time * 0.1));
                    float embers = noise((pixel / u_resolution.xy) * vec2(14.0, 16.0) + vec2(-u_time * 0.18, u_time * 0.06));
                    float glow = smoothstep(0.4, 1.0, flow + (rim * 0.3));
                    color = mix(vec3(0.12, 0.01, 0.01), vec3(0.78, 0.06, 0.02), flow + 0.08);
                    color = mix(color, vec3(1.0, 0.64, 0.12), glow * 0.6);
                    color += vec3(1.0, 0.18, 0.02) * smoothstep(0.76, 1.0, embers) * 0.24;
                    alpha = body * 0.98;
                }

                gl_FragColor = vec4(color, alpha);
            }
        `);

        if (!vertexShader || !fragmentShader) {
            return null;
        }

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.warn("FluidSurfaceRenderer link error:", this.gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.warn("FluidSurfaceRenderer shader error:", this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }
}

export class PhysicsView {
    constructor({ container, treasureElement, stoneElement = null }) {
        this.containerElement = container;
        this.treasureElement = treasureElement;
        this.stage4TreasureBarrierElement =
            this.containerElement?.querySelector("[data-stage4-treasure-barrier='true']") ?? null;
        this.stoneElement = stoneElement;
        this.fluidRenderers = new Map();
        this.solidifiedBlockPool = [];
    }

    initialize(physicsModel) {
        if (!physicsModel.enabled) {
            return;
        }

        physicsModel.fluidZones.forEach((zone) => {
            zone.element.classList.add("physics-fluid");
        });

        const activeRendererIds = (
            physicsModel.getFluidRenderGroups?.() ?? []
        ).map((group) => group.rendererId);
        this.cleanupFluidResources(activeRendererIds);
        this.treasureElement?.classList.add("physics-managed");
        this.stage4TreasureBarrierElement?.classList.add("physics-managed");
        this.stoneElement?.classList.add("physics-managed");
    }

    cleanupFluidResources(activeRendererIds) {
        const activeRendererIdSet = new Set(activeRendererIds);

        for (const [rendererId, renderer] of this.fluidRenderers.entries()) {
            if (activeRendererIdSet.has(rendererId)) {
                continue;
            }

            renderer?.canvas?.remove();
            this.fluidRenderers.delete(rendererId);
        }
    }

    render(physicsModel) {
        if (!physicsModel.enabled || !physicsModel.initialized) {
            return;
        }

        const fluidRenderGroups = physicsModel.getFluidRenderGroups?.() ?? [];
        const activeRendererIds = fluidRenderGroups.map((group) => group.rendererId);
        this.cleanupFluidResources(activeRendererIds);
        fluidRenderGroups.forEach((group) => {
            this.renderFluidGroup(group, physicsModel);
        });
        this.renderSolidifiedBlocks(physicsModel);
        this.renderTreasure(physicsModel);
        this.renderStone(physicsModel);
    }

    ensureSolidifiedBlockPool(size) {
        while (this.solidifiedBlockPool.length < size) {
            const blockElement = document.createElement("span");
            blockElement.className = "solidified-block";
            this.containerElement.appendChild(blockElement);
            this.solidifiedBlockPool.push(blockElement);
        }

        while (this.solidifiedBlockPool.length > size) {
            const blockElement = this.solidifiedBlockPool.pop();
            blockElement?.remove();
        }
    }

    renderSolidifiedBlocks(physicsModel) {
        const blocks = physicsModel.solidifiedRects;
        this.ensureSolidifiedBlockPool(blocks.length);

        blocks.forEach((block, index) => {
            const blockElement = this.solidifiedBlockPool[index];

            if (!blockElement) {
                return;
            }

            blockElement.className = block.elementType === "ice"
                ? "solidified-block solidified-block--ice"
                : "solidified-block";
            blockElement.style.width = `${block.width}px`;
            blockElement.style.height = `${block.height}px`;
            blockElement.style.transform = `translate3d(${block.left}px, ${block.top}px, 0)`;
        });
    }

    renderFluidGroup(group, physicsModel) {
        const { rendererId, type, particles, clipRect, renderScale: zoneRenderScale } = group;

        if (!this.fluidRenderers.has(rendererId)) {
            this.fluidRenderers.set(
                rendererId,
                new FluidSurfaceRenderer(this.containerElement, type),
            );
        }

        const renderer = this.fluidRenderers.get(rendererId);
        const renderScale =
            typeof zoneRenderScale === "number"
                ? zoneRenderScale
                : this.getFluidRenderScale(type);
        const renderedByWebGL = renderer?.render(
            particles.map((particle) => ({
                ...particle,
                radius: particle.radius * renderScale,
            })),
            physicsModel.renderObstacles,
            clipRect,
            physicsModel.elapsed,
        );

        if (!renderedByWebGL) {
            renderer?.canvas?.remove();
            this.fluidRenderers.delete(rendererId);
        }
    }

    getFluidRenderScale(key) {
        switch (key) {
            case "lava":
                return 0.62;
            case "fire":
                return 0.58;
            case "super-lava":
                return 0.64;
            case "ice-water":
                return 0.68;
            case "water":
            default:
                return 0.66;
        }
    }

    renderTreasure(physicsModel) {
        const treasureBody = physicsModel.dynamicBodies.treasure;

        if (!treasureBody || !this.treasureElement) {
            return;
        }

        const width = treasureBody.plugin.renderWidth;
        const height = treasureBody.plugin.renderHeight;
        const x = treasureBody.position.x - (width / 2);
        const y = treasureBody.position.y - (height / 2);

        this.treasureElement.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${treasureBody.angle}rad)`;
        if (this.stage4TreasureBarrierElement) {
            const barrierWidth = this.stage4TreasureBarrierElement.offsetWidth;
            const barrierHeight = this.stage4TreasureBarrierElement.offsetHeight;
            const barrierX = treasureBody.position.x - (barrierWidth / 2);
            const barrierY = treasureBody.position.y - (barrierHeight / 2);

            this.stage4TreasureBarrierElement.style.transform =
                `translate3d(${barrierX}px, ${barrierY}px, 0)`;
        }
    }

    renderStone(physicsModel) {
        if (!this.stoneElement) {
            return;
        }

        const stoneState = physicsModel.getStoneState?.() ?? "grounded";
        this.stoneElement.hidden = stoneState === "held" || stoneState === "missing";

        this.stoneElement.classList.toggle("is-airborne", stoneState === "thrown");
        this.stoneElement.classList.remove("is-held-ui");

        if (stoneState === "held" || stoneState === "missing") {
            return;
        }

        const stoneBody = physicsModel.dynamicBodies.stone;

        if (!stoneBody) {
            return;
        }

        const width = stoneBody.plugin.renderWidth;
        const height = stoneBody.plugin.renderHeight;
        const x = stoneBody.position.x - (width / 2);
        const y = stoneBody.position.y - (height / 2);

        this.stoneElement.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${stoneBody.angle}rad)`;
    }

    destroy() {
        for (const renderer of this.fluidRenderers.values()) {
            renderer?.canvas?.remove();
        }

        this.solidifiedBlockPool.forEach((blockElement) => {
            blockElement.remove();
        });

        this.fluidRenderers = new Map();
        this.solidifiedBlockPool = [];
    }
}
