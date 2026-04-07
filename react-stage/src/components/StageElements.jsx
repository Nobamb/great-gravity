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
    runtimeSolid = false,
    anchored = true,
}) {
    return (
        <div
            className={className}
            data-collider={runtimeSolid ? undefined : "solid"}
            data-element-type="ice"
            data-element-id={zoneId}
            data-effect={effect}
            data-solidified-block={runtimeSolid ? "true" : undefined}
            data-solidified-id={runtimeSolid ? zoneId : undefined}
            data-solidified-anchored={runtimeSolid ? (anchored ? "true" : "false") : undefined}
            style={createZoneStyle(width, height, style)}
        ></div>
    );
}
