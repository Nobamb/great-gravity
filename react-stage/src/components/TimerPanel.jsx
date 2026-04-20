export default function TimerPanel() {
    return (
        <div className="timer-ui">
            <div className="timer-ui__value" data-timer-value="true">00:00:00</div>
            <div
                className="timer-ui__restart"
                data-restart-hold="true"
                data-complete="false"
                hidden
                aria-label="hold R to restart"
            >
                <div className="timer-ui__restart-ring" data-restart-ring="true">
                    <div className="timer-ui__restart-core">R</div>
                </div>
            </div>
        </div>
    );
}
