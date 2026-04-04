import { forwardRef } from "react";

const TreasurePile = forwardRef(function TreasurePile({ className = "" }, ref) {
    return (
        <div className={`treasure-pile ${className}`.trim()} ref={ref}>
            <div className="sword">
                <div className="sword-hilt">
                    <div className="gem"></div>
                </div>
            </div>
            <div className="coins-container">
                <div className="coins"></div>
            </div>
        </div>
    );
});

export default TreasurePile;
