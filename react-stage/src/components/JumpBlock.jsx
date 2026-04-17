import React from 'react';

export default function JumpBlock({
    className = "",
    width,
    left,
    right,
    top,
    bottom,
    style = {},
    ...rest
}) {
    const combinedStyle = {
        ...(width !== undefined && { width }),
        ...(left !== undefined && { left }),
        ...(right !== undefined && { right }),
        ...(top !== undefined && { top }),
        ...(bottom !== undefined && { bottom }),
        ...style,
    };

    return (
        <div
            className={`jump-block ${className}`}
            style={combinedStyle}
            data-collider="solid"
            data-effect="jump-boost"
            {...rest}
        />
    );
}
