import { forwardRef } from "react";

const CharacterSprite = forwardRef(function CharacterSprite(_, ref) {
    return (
        <div className="character" ref={ref}>
            <div className="character-head">
                <div className="character-eye"></div>
            </div>
        </div>
    );
});

export default CharacterSprite;
