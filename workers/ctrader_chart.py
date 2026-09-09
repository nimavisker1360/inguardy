import base64
import io
import json
import sys


def number_value(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def render_chart(request):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import mplfinance as mpf
    import pandas as pd

    bars = request.get("bars") or []
    if len(bars) < 10:
        raise ValueError("At least 10 chart bars are required.")

    data = pd.DataFrame(bars)
    data["time"] = pd.to_datetime(data["time"], unit="s", utc=True)
    data = data.rename(columns={
        "open": "Open", "high": "High", "low": "Low",
        "close": "Close", "volume": "Volume",
    }).set_index("time")
    data = data[["Open", "High", "Low", "Close", "Volume"]]

    colors = mpf.make_marketcolors(
        up="#16a085", down="#e25555", edge="inherit", wick="inherit", volume="inherit"
    )
    style = mpf.make_mpf_style(
        base_mpf_style="nightclouds", marketcolors=colors,
        facecolor="#111827", figcolor="#111827", gridcolor="#334155", gridstyle="--",
        rc={
            "axes.labelcolor": "#cbd5e1", "axes.titlecolor": "#f8fafc",
            "xtick.color": "#94a3b8", "ytick.color": "#94a3b8", "font.size": 10,
        },
    )
    stage = str(request.get("stage") or "entry").upper()
    direction = str(request.get("direction") or "").upper()
    title = (
        f"{stage} | {request.get('symbol', '')} {direction} | "
        f"{request.get('timeframe', 'M5')} | {request.get('capturedAt', '')}"
    )
    figure, axes = mpf.plot(
        data, type="candle", style=style, volume=True, title=title,
        figsize=(14.4, 8.1), tight_layout=True, returnfig=True, warn_too_much_data=500,
    )
    price_axis = axes[0]
    for axis in [price_axis] + ([axes[2]] if len(axes) > 2 else []):
        left, right = axis.get_xlim()
        axis.set_xlim(left, right + (right - left) * 0.1)

    levels = [
        ("Entry", number_value(request.get("entryPrice")), "#60a5fa", "-"),
        ("SL", number_value(request.get("stopLoss")), "#fb7185", "--"),
        ("TP", number_value(request.get("takeProfit")), "#4ade80", "--"),
        ("Exit", number_value(request.get("exitPrice")), "#fbbf24", "-"),
    ]
    for label, price, color, line_style in levels:
        if price <= 0 or (label == "Exit" and stage != "EXIT"):
            continue
        price_axis.axhline(price, color=color, linestyle=line_style, linewidth=1.2, alpha=0.95)
        price_axis.text(
            0.995, price, f" {label} {price:g} ",
            transform=price_axis.get_yaxis_transform(), horizontalalignment="right",
            verticalalignment="bottom", color=color, fontsize=9,
            bbox={"facecolor": "#111827", "edgecolor": color, "alpha": 0.82, "pad": 1.5},
        )

    marker_price = number_value(
        request.get("exitPrice") if stage == "EXIT" else request.get("entryPrice")
    )
    if marker_price > 0:
        price_axis.scatter(
            data.index[-1], marker_price, marker="^" if direction == "BUY" else "v",
            color="#fbbf24" if stage == "EXIT" else "#60a5fa",
            edgecolors="#f8fafc", linewidths=0.7, s=110, zorder=5,
        )

    image = io.BytesIO()
    figure.savefig(image, format="png", dpi=160, facecolor=figure.get_facecolor())
    plt.close(figure)
    return base64.b64encode(image.getvalue()).decode("ascii")


def main():
    try:
        request = json.loads(sys.stdin.read() or "{}")
        result = {"ok": True, "imageBase64": render_chart(request)}
    except Exception as error:
        result = {"ok": False, "error": f"Could not render chart: {error}"}
    sys.stdout.write(json.dumps(result, ensure_ascii=True, separators=(",", ":")))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
