export default function BreathHud() {
    return (
        <div className="breath-ui" data-breath-ui="true" hidden>
            <div className="breath-ui__label" aria-hidden="true">
                <svg
                    className="breath-ui__label-svg"
                    viewBox="0 0 54 20"
                    role="presentation"
                >
                    <text x="0" y="15" className="breath-ui__label-text">
                        O<tspan dx="1" dy="2" className="breath-ui__label-sub">2</tspan>
                    </text>
                </svg>
            </div>
            <div className="breath-ui__bar">
                <div
                    className="breath-ui__fill"
                    data-breath-fill="true"
                ></div>
            </div>
        </div>
    );
}
