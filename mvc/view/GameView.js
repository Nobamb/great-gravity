export class GameView {
    constructor(characterElement) {
        this.characterElement = characterElement;
    }

    measureCharacter() {
        const rect = this.characterElement.getBoundingClientRect();

        return {
            width: rect.width,
            height: rect.height,
        };
    }

    render(character) {
        this.characterElement.style.transform = `translate3d(${character.x}px, ${character.y}px, 0)`;
        this.characterElement.classList.add("is-ready");
        this.characterElement.classList.toggle("is-moving", Math.abs(character.vx) > 8 && character.onGround);
        this.characterElement.classList.toggle("is-jumping", !character.onGround && !character.isClimbing);
        this.characterElement.classList.toggle("is-climbing", character.isClimbing);
        this.characterElement.classList.toggle("is-facing-left", character.facing < 0);
    }
}
