import React from 'react';

export default function Ladder({
    className = "",
    width,
    height,
    left,
    right,
    top,
    bottom,
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

    return (
        <div
            className={`ladder ${className}`}
            style={combinedStyle}
            data-collider="ladder"
            {...rest}
        />
    );
}
