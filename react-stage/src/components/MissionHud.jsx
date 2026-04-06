function normalizeMissionItems(missionFaces, missionCounts) {
    const itemCount = Math.max(missionFaces.length, missionCounts.length);

    return Array.from({ length: itemCount }, (_, index) => ({
        key: `mission-item-${index}`,
        face: missionFaces[index] ?? null,
        count: missionCounts[index] ?? null,
    }));
}

export default function MissionHud({
    missionFaces = [],
    missionCounts = [],
    ariaLabel = "mission progress",
}) {
    const missionItems = normalizeMissionItems(missionFaces, missionCounts);

    return (
        <div className="mission-ui" aria-label={ariaLabel}>
            {missionItems.map(({ key, face, count }) => (
                <div className="mission-ui__row" key={key}>
                    <div className="mission-ui__face">{face}</div>
                    <div className="mission-ui__count">{count}</div>
                </div>
            ))}
        </div>
    );
}
