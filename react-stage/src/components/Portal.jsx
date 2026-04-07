function PortalShell({
    className = "",
    portalId,
    kind,
    targetId,
    exitDirection = "right",
}) {
    return (
        <div
            className={`portal ${className}`.trim()}
            data-portal-id={portalId}
            data-portal-kind={kind}
            data-portal-target={targetId}
            data-portal-exit-direction={kind === "out" ? exitDirection : undefined}
            aria-hidden="true"
        >
            <span className="portal__halo"></span>
            <span className="portal__core"></span>
            <span className="portal__swirl portal__swirl--a"></span>
            <span className="portal__swirl portal__swirl--b"></span>
            <span className="portal__spark portal__spark--a"></span>
            <span className="portal__spark portal__spark--b"></span>
        </div>
    );
}

export function PortalIn({ className = "", portalId, targetId }) {
    return (
        <PortalShell
            className={`portal--in ${className}`.trim()}
            portalId={portalId}
            kind="in"
            targetId={targetId}
        />
    );
}

export function PortalOut({
    className = "",
    portalId,
    exitDirection = "right",
}) {
    return (
        <PortalShell
            className={`portal--out ${className}`.trim()}
            portalId={portalId}
            kind="out"
            exitDirection={exitDirection}
        />
    );
}
