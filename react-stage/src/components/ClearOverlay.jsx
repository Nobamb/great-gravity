const STAR_TRACK = "\u2606";
const STAR_FILL = "\u2605";

export default function ClearOverlay() {
    return (
        <div className="clear-overlay" hidden>
            <div className="clear-card">
                <div className="clear-title">Stage Clear</div>
                <div className="clear-time">00:00:00</div>
                <div className="clear-stars" aria-label="stars">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <span className="clear-star" key={index}>
                            <span className="clear-star-track">{STAR_TRACK}</span>
                            <span className="clear-star-mask">
                                <span className="clear-star-fill">{STAR_FILL}</span>
                            </span>
                        </span>
                    ))}
                </div>
                <div className="clear-actions">
                    <button
                        type="button"
                        className="clear-action clear-action--retry"
                    >
                        다시하기
                    </button>
                    <button
                        type="button"
                        className="clear-action clear-action--next"
                        hidden
                    >
                        다음 스테이지
                    </button>
                    <button
                        type="button"
                        className="clear-action clear-action--main"
                        disabled
                    >
                        메인화면
                    </button>
                </div>
            </div>
        </div>
    );
}
