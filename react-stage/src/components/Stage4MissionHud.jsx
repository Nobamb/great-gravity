export default function Stage4MissionHud() {
    return (
        <div className="stage4-mission-ui" aria-label="remaining monster mission">
            <div className="stage4-mission-ui__monster" aria-hidden="true">
                <div className="stage4-mission-ui__monster-eye"></div>
                <div className="stage4-mission-ui__monster-teeth"></div>
            </div>
            <div className="stage4-mission-ui__count">
                x <span data-stage4-monster-count="true">1</span>
            </div>
        </div>
    );
}
