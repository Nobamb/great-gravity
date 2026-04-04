function TriggerBlock({ placement, triggerId, triggerDirection }) {
    return (
        <div
            className={`trigger-block trigger-block--${placement}`}
            data-trigger-id={triggerId}
            data-trigger-direction={triggerDirection}
        ></div>
    );
}

export default function TriggerableBlock({
    className,
    triggerPlacement,
    triggerId,
    triggerDirection,
    children,
}) {
    return (
        <div
            className={className}
            data-collider="solid"
            data-triggerable="true"
        >
            <TriggerBlock
                placement={triggerPlacement}
                triggerId={triggerId}
                triggerDirection={triggerDirection}
            />
            {children}
        </div>
    );
}
