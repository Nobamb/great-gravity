export default function Cannon({
    className = "",
    cannonId,
    variant = "normal",
    seatClassName = "",
    singleUse = false,
    launchMultiplier = 1,
    disabled = false,
}) {
    const rootClassName = `cannon cannon--${variant} ${className}`.trim();

    if (variant === "gold") {
        return (
            <div
                className={rootClassName}
                data-cannon="true"
                data-cannon-id={cannonId}
                data-cannon-variant={variant}
                data-cannon-single-use={singleUse ? "true" : undefined}
                data-cannon-launch-multiplier={String(launchMultiplier)}
                data-cannon-disabled={disabled ? "true" : undefined}
            >
                <div
                    className={`cannon__interaction-seat ${seatClassName}`.trim()}
                    data-cannon-seat="true"
                ></div>
                <div
                    className="cannon__interaction-muzzle"
                    data-cannon-muzzle="true"
                ></div>
                <div className={`cannon__seat ${seatClassName}`.trim()}></div>
                <div className="cannon__barrel"></div>
                <div className="cannon__mouth"></div>
                <div className="cannon__base"></div>
                <div className="cannon__wheel cannon__wheel--left">
                    <span className="cannon__wheel-spoke"></span>
                </div>
            </div>
        );
    }

    return (
        <div
            className={rootClassName}
            data-cannon="true"
            data-cannon-id={cannonId}
            data-cannon-variant={variant}
            data-cannon-single-use={singleUse ? "true" : undefined}
            data-cannon-launch-multiplier={String(launchMultiplier)}
            data-cannon-disabled={disabled ? "true" : undefined}
        >
            <div
                className={`stage3-cannon-seat ${seatClassName}`.trim()}
                data-cannon-seat="true"
            ></div>
            <div className="stage3-cannon-barrel" data-cannon-muzzle="true"></div>
            <div className="stage3-cannon-wheel stage3-cannon-wheel--left"></div>
            <div className="stage3-cannon-wheel stage3-cannon-wheel--right"></div>
        </div>
    );
}
