const MAX_FLUID_PARTICLES = 64;
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

        this.ready = false;

        if (!this.gl) {
            return;
        }

        this.program = this.createProgram();
        if (!this.program) {
            return;
        }

        this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
        this.resolutionLocation = this.gl.getUniformLocation(this.program, "u_resolution");
        this.timeLocation = this.gl.getUniformLocation(this.program, "u_time");
        this.countLocation = this.gl.getUniformLocation(this.program, "u_count");
        this.pointsLocation = this.gl.getUniformLocation(this.program, "u_points[0]");
        this.variantLocation = this.gl.getUniformLocation(this.program, "u_variant");
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
            this.gl.viewport(0, 0, width, height);
        }
    }

    render(particles, obstacles, time) {
        if (!this.ready) {
            return false;
        }

        this.resize();

        const packedParticles = new Float32Array(MAX_FLUID_PARTICLES * 3);
        const particleCount = Math.min(particles.length, MAX_FLUID_PARTICLES);
        for (let index = 0; index < particleCount; index += 1) {
            const particle = particles[index];
            packedParticles[(index * 3)] = particle.x;
            packedParticles[(index * 3) + 1] = particle.y;
            packedParticles[(index * 3) + 2] = particle.radius;
        }

        const packedObstacles = new Float32Array(MAX_OBSTACLES * 4);
        const obstacleCount = Math.min(obstacles.length, MAX_OBSTACLES);
        for (let index = 0; index < obstacleCount; index += 1) {
            const obstacle = obstacles[index];
            packedObstacles[(index * 4)] = obstacle.x;
            packedObstacles[(index * 4) + 1] = obstacle.y;
            packedObstacles[(index * 4) + 2] = obstacle.width;
            packedObstacles[(index * 4) + 3] = obstacle.height;
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
        this.gl.uniform1f(this.variantLocation, this.variant === "lava" ? 1 : 0);
        this.gl.uniform1i(this.obstacleCountLocation, obstacleCount);
        this.gl.uniform4fv(this.obstaclesLocation, packedObstacles);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

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
                float field = 0.0;
                float nearestObstacle = 99999.0;

                for (int index = 0; index < MAX_PARTICLES; index += 1) {
                    if (index >= u_count) {
                        break;
                    }

                    vec3 point = u_points[index];
                    vec2 delta = pixel - point.xy;
                    float distanceSquared = max(dot(delta, delta), 1.0);
                    float influence = mix(1.18, 1.32, u_variant);
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
                float obstacleTightening = smoothstep(0.0, 20.0, nearestObstacle);
                float threshold = mix(0.96, 1.14, u_variant) + ((1.0 - obstacleTightening) * 0.4);
                float body = smoothstep(threshold - 0.12, threshold + 0.03, field);

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
                } else {
                    float flow = noise((pixel / u_resolution.xy) * vec2(4.0, 7.0) + vec2(u_time * 0.18, -u_time * 0.08));
                    float embers = noise((pixel / u_resolution.xy) * vec2(10.0, 14.0) + vec2(-u_time * 0.12, u_time * 0.05));
                    float glow = smoothstep(0.45, 1.0, flow + (rim * 0.26));
                    color = mix(vec3(0.46, 0.07, 0.04), vec3(0.94, 0.32, 0.10), flow + 0.12);
                    color = mix(color, vec3(1.0, 0.74, 0.28), glow * 0.55);
                    color += vec3(0.82, 0.22, 0.05) * smoothstep(0.74, 1.0, embers) * 0.18;
                    alpha = body * 0.96;
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
    constructor({ lavaElement, waterElement, treasureElement }) {
        this.containerElement = lavaElement.parentElement;
        this.lavaElement = lavaElement;
        this.waterElement = waterElement;
        this.treasureElement = treasureElement;
        this.fluidRenderers = {
            lava: null,
            water: null,
        };
        this.particlePools = {
            lava: [],
            water: [],
        };
    }

    initialize(physicsModel) {
        if (!physicsModel.enabled) {
            return;
        }

        this.lavaElement.classList.add("physics-fluid");
        this.waterElement.classList.add("physics-fluid");
        this.treasureElement.classList.add("physics-managed");

        // 캔버스를 게임 컨테이너에 배치 (유체가 어디로든 흘러가는 것을 렌더링)
        this.fluidRenderers.lava ??= new FluidSurfaceRenderer(this.containerElement, "lava");
        this.fluidRenderers.water ??= new FluidSurfaceRenderer(this.containerElement, "water");

        if (!this.fluidRenderers.lava.ready) {
            this.ensureParticlePool("lava", physicsModel.dynamicBodies.lava.length);
        }

        if (!this.fluidRenderers.water.ready) {
            this.ensureParticlePool("water", physicsModel.dynamicBodies.water.length);
        }
    }

    ensureParticlePool(key, size) {
        const className = key === "lava" ? "lava-particle" : "water-particle";
        const pool = this.particlePools[key];

        while (pool.length < size) {
            const particleElement = document.createElement("span");
            particleElement.className = `physics-particle physics-particle--${key} ${className}`;
            this.containerElement.appendChild(particleElement);
            pool.push(particleElement);
        }

        while (pool.length > size) {
            const particleElement = pool.pop();
            particleElement?.remove();
        }
    }

    render(physicsModel) {
        if (!physicsModel.enabled || !physicsModel.initialized) {
            return;
        }

        this.renderFluid("lava", physicsModel);
        this.renderFluid("water", physicsModel);
        this.renderTreasure(physicsModel);
    }

    renderFluid(key, physicsModel) {
        const bodies = physicsModel.dynamicBodies[key];
        const particles = bodies.map((body) => {
            return {
                x: body.position.x,
                y: body.position.y,
                radius: body.circleRadius,
            };
        });

        const renderer = this.fluidRenderers[key];
        const renderedByWebGL = renderer?.render(
            particles,
            physicsModel.renderObstacles,
            physicsModel.elapsed,
        );

        if (renderedByWebGL) {
            return;
        }

        const pool = this.particlePools[key];
        bodies.forEach((body, index) => {
            const particleElement = pool[index];

            if (!particleElement) {
                return;
            }

            const radius = body.circleRadius;
            const x = body.position.x - radius;
            const y = body.position.y - radius;
            const size = radius * 2;

            particleElement.style.width = `${size}px`;
            particleElement.style.height = `${size}px`;
            particleElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
    }

    renderTreasure(physicsModel) {
        const treasureBody = physicsModel.dynamicBodies.treasure;

        if (!treasureBody) {
            return;
        }

        const width = treasureBody.plugin.renderWidth;
        const height = treasureBody.plugin.renderHeight;
        const x = treasureBody.position.x - (width / 2);
        const y = treasureBody.position.y - (height / 2);

        this.treasureElement.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${treasureBody.angle}rad)`;
    }
}
