import { forwardRef } from "react";

const CharacterSprite = forwardRef(function CharacterSprite(
    { heldStoneRef = null },
    ref,
) {
    return (
        <div className="character" ref={ref}>
            <div
                className="held-stone held-stone--character"
                ref={heldStoneRef}
                hidden
            ></div>
            <div className="character-head">
                <div className="character-eye"></div>
            </div>
        </div>
    );
});

export default CharacterSprite;
