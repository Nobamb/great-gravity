import React from 'react';
import TriggerableBlock from './TriggerableBlock';

export default function DefaultBlock({
    className = "",
    width,
    height,
    left,
    right,
    top,
    bottom,
    hasTrigger = false,
    triggerPlacement,
    triggerId,
    triggerDirection,
    triggerTargets,
    projectileTrigger = true,
    interactTrigger = true,
    children,
    style = {},
    ...rest
}) {
    const combinedStyle = {
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(left !== undefined && { left }),
        ...(right !== undefined && { right }),
        ...(top !== undefined && { top }),
        ...(bottom !== undefined && { bottom }),
        ...style,
    };

    if (hasTrigger) {
        return (
            <TriggerableBlock
                className={className}
                triggerPlacement={triggerPlacement}
                triggerId={triggerId}
                triggerDirection={triggerDirection}
                triggerTargets={triggerTargets}
                projectileTrigger={projectileTrigger}
                interactTrigger={interactTrigger}
                style={combinedStyle}
                {...rest}
            >
                {children}
            </TriggerableBlock>
        );
    }

    return (
        <div
            className={className}
            style={combinedStyle}
            data-collider="solid"
            {...rest}
        >
            {children}
        </div>
    );
}