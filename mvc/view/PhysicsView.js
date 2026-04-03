const MAX_FLUID_PARTICLES = 64;

class FluidSurfaceRenderer {
    constructor(hostElement, variant) {
        this.hostElement = hostElement;
        this.variant = variant;
        this.canvas = document.createElement("canvas");
        this.canvas.className = "physics-fluid-canvas";
        this.hostElement.appendChild(this.canvas);

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
        const width = Math.max(1, Math.round(this.hostElement.clientWidth * dpr));
        const height = Math.max(1, Math.round(this.hostElement.clientHeight * dpr));

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.gl.viewport(0, 0, width, height);
        }
    }

    render(particles, time) {
        if (!this.ready) {
            return false;
        }

        this.resize();

        const packed = new Float32Array(MAX_FLUID_PARTICLES * 3);
        const count = Math.min(particles.length, MAX_FLUID_PARTICLES);

        for (let index = 0; index < count; index += 1) {
            const particle = particles[index];
            packed[(index * 3)] = particle.x;
            packed[(index * 3) + 1] = particle.y;
            packed[(index * 3) + 2] = particle.radius;
        }

        this.gl.useProgram(this.program);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.timeLocation, time);
        this.gl.uniform1i(this.countLocation, count);
        this.gl.uniform3fv(this.pointsLocation, packed);
        this.gl.uniform1f(this.variantLocation, this.variant === "lava" ? 1 : 0);
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

            varying vec2 v_uv;

            uniform vec2 u_resolution;
            uniform float u_time;
            uniform int u_count;
            uniform vec3 u_points[MAX_PARTICLES];
            uniform float u_variant;

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
                vec2 pixel = v_uv * u_resolution;
                float field = 0.0;

                for (int index = 0; index < MAX_PARTICLES; index += 1) {
                    if (index >= u_count) {
                        break;
                    }

                    vec3 point = u_points[index];
                    vec2 delta = pixel - point.xy;
                    float distanceSquared = max(dot(delta, delta), 1.0);
                    field += (point.z * point.z * 1.85) / distanceSquared;
                }

                float threshold = mix(1.0, 1.22, u_variant);
                float body = smoothstep(threshold - 0.18, threshold + 0.05, field);

                if (body <= 0.01) {
                    discard;
                }

                float rim = smoothstep(threshold, threshold + 0.55, field);
                vec3 color;
                float alpha;

                if (u_variant < 0.5) {
                    float spread = smoothstep(0.0, 1.0, v_uv.x);
                    float wave = sin((v_uv.x * 9.0) - (u_time * 3.6) + (v_uv.y * 5.0)) * 0.08;
                    float highlight = smoothstep(0.58, 1.0, v_uv.y + wave + (rim * 0.16));
                    color = mix(vec3(0.15, 0.41, 0.89), vec3(0.50, 0.88, 1.0), v_uv.y + 0.18 + wave);
                    color += vec3(0.12, 0.20, 0.28) * spread * 0.18;
                    color += vec3(0.82, 0.95, 1.0) * highlight * 0.38;
                    alpha = body * 0.88;
                } else {
                    float flow = noise((pixel / u_resolution.xy) * vec2(4.0, 7.0) + vec2(u_time * 0.22, -u_time * 0.12));
                    float embers = noise((pixel / u_resolution.xy) * vec2(11.0, 15.0) + vec2(-u_time * 0.18, u_time * 0.08));
                    float glow = smoothstep(0.45, 1.0, flow + (rim * 0.35));
                    color = mix(vec3(0.54, 0.08, 0.04), vec3(1.0, 0.40, 0.12), flow + 0.15);
                    color = mix(color, vec3(1.0, 0.77, 0.30), glow * 0.62);
                    color += vec3(0.9, 0.28, 0.08) * smoothstep(0.72, 1.0, embers) * 0.24;
                    alpha = body * 0.95;
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

        this.fluidRenderers.lava ??= new FluidSurfaceRenderer(this.lavaElement, "lava");
        this.fluidRenderers.water ??= new FluidSurfaceRenderer(this.waterElement, "water");

        if (!this.fluidRenderers.lava.ready) {
            this.ensureParticlePool("lava", physicsModel.dynamicBodies.lava.length);
        }

        if (!this.fluidRenderers.water.ready) {
            this.ensureParticlePool("water", physicsModel.dynamicBodies.water.length);
        }
    }

    ensureParticlePool(key, size) {
        const targetElement = key === "lava" ? this.lavaElement : this.waterElement;
        const className = key === "lava" ? "lava-particle" : "water-particle";
        const pool = this.particlePools[key];

        while (pool.length < size) {
            const particleElement = document.createElement("span");
            particleElement.className = `physics-particle ${className}`;
            targetElement.appendChild(particleElement);
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
        const origin = physicsModel.fluidOrigins[key];
        const bodies = physicsModel.dynamicBodies[key];

        if (!origin) {
            return;
        }

        const particles = bodies.map((body) => {
            return {
                x: body.position.x - origin.left,
                y: body.position.y - origin.top,
                radius: body.circleRadius,
            };
        });

        const renderer = this.fluidRenderers[key];
        const renderedByWebGL = renderer?.render(particles, physicsModel.elapsed);

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
            const localX = body.position.x - origin.left - radius;
            const localY = body.position.y - origin.top - radius;
            const size = radius * 2;

            particleElement.style.width = `${size}px`;
            particleElement.style.height = `${size}px`;
            particleElement.style.transform = `translate3d(${localX}px, ${localY}px, 0)`;
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
