function resolveDimension(value) {
    if (value === undefined || value === null) {
        return undefined;
    }

    return typeof value === "number" ? `${value}px` : value;
}

function createZoneStyle(width, height, style = {}) {
    return {
        ...style,
        width: resolveDimension(width),
        height: resolveDimension(height),
        "--zone-width": resolveDimension(width),
        "--zone-height": resolveDimension(height),
    };
}

function ElementZone({
    className = "",
    zoneId,
    elementType,
    width,
    height,
    style,
}) {
    return (
        <div
            className={className}
            data-fluid-type={elementType}
            data-fluid-id={zoneId}
            style={createZoneStyle(width, height, style)}
        ></div>
    );
}

export function WaterZone(props) {
    return <ElementZone {...props} elementType="water" />;
}

export function LavaZone(props) {
    return <ElementZone {...props} elementType="lava" />;
}

export function FireZone(props) {
    return <ElementZone {...props} elementType="fire" />;
}

export function IceZone({
    className = "",
    zoneId,
    width,
    height,
    style,
    effect = "ice-slip",
}) {
    return (
        <div
            className={className}
            data-collider="solid"
            data-element-type="ice"
            data-element-id={zoneId}
            data-effect={effect}
            style={createZoneStyle(width, height, style)}
        ></div>
    );
}
