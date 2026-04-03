export class PhysicsView {
    constructor({ lavaElement, waterElement, treasureElement }) {
        this.lavaElement = lavaElement;
        this.waterElement = waterElement;
        this.treasureElement = treasureElement;
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

        this.ensureParticlePool("lava", physicsModel.dynamicBodies.lava.length);
        this.ensureParticlePool("water", physicsModel.dynamicBodies.water.length);
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
        const pool = this.particlePools[key];

        if (!origin) {
            return;
        }

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
