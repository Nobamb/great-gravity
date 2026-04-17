function TriggerBlock({ placement, triggerId, triggerDirection, triggerTargets, projectileTrigger = true, interactTrigger = true }) {
    return (
        <div
            className={`trigger-block trigger-block--${placement}`}
            data-trigger-id={triggerId}
            data-trigger-direction={triggerDirection}
            data-trigger-targets={triggerTargets}
            data-projectile-trigger={projectileTrigger ? "true" : undefined}
            data-interact-trigger={interactTrigger ? undefined : "false"}
        ></div>
    );
}

export default function TriggerableBlock({
    className,
    triggerPlacement,
    triggerId,
    triggerDirection,
    triggerTargets,
    projectileTrigger = true,
    interactTrigger = true,
    children,
    style,
    ...rest
}) {
    return (
        <div
            className={className}
            style={style}
            data-collider="solid"
            data-triggerable="true"
            {...rest}
        >
            <TriggerBlock
                placement={triggerPlacement}
                triggerId={triggerId}
                triggerDirection={triggerDirection}
                triggerTargets={triggerTargets}
                projectileTrigger={projectileTrigger}
                interactTrigger={interactTrigger}
            />
            {children}
        </div>
    );
}
