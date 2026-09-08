import base64
import io
import os
from datetime import datetime, timedelta, timezone


TIMEFRAMES = {
    "M1": (1, 60),
    "M5": (5, 5 * 60),
    "M15": (15, 15 * 60),
    "M30": (30, 30 * 60),
    "H1": (16385, 60 * 60),
    "H4": (16388, 4 * 60 * 60),
    "D1": (16408, 24 * 60 * 60),
}


def parse_datetime(value):
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def number_value(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def render_mt5_chart(mt5, request):
    import matplotlib

    matplotlib.use("Agg")

    import matplotlib.pyplot as plt
    import mplfinance as mpf
    import pandas as pd

    symbol = str(request.get("symbol") or "").strip()
    timeframe_label = str(request.get("timeframe") or "M5").strip().upper()
    captured_at = parse_datetime(request.get("capturedAt"))
    bars = max(40, min(int(request.get("bars") or 90), 240))
    stage = str(request.get("stage") or "entry").strip().upper()
    direction = str(request.get("direction") or "").strip().upper()

    timeframe = TIMEFRAMES.get(timeframe_label)
    if not symbol or timeframe is None:
        raise ValueError("A valid symbol and timeframe are required for chart capture.")

    if not mt5.symbol_select(symbol, True):
        raise RuntimeError(f"Could not select symbol {symbol}.")

    time_offset_hours = float(os.environ.get("MT5_TIME_OFFSET_HOURS", "0"))
    server_captured_at = captured_at + timedelta(hours=time_offset_hours)
    rates = mt5.copy_rates_from(symbol, timeframe[0], server_captured_at, bars)
    if rates is None or len(rates) < 10:
        error = mt5.last_error()
        raise RuntimeError(f"Could not read enough chart bars ({error[0]}): {error[1]}")

    data = pd.DataFrame(rates)
    data["time"] = pd.to_datetime(data["time"], unit="s", utc=True) - pd.Timedelta(
        hours=time_offset_hours
    )
    data = data.rename(
        columns={
            "open": "Open",
            "high": "High",
            "low": "Low",
            "close": "Close",
            "tick_volume": "Volume",
        }
    ).set_index("time")
    data = data[["Open", "High", "Low", "Close", "Volume"]]

    market_colors = mpf.make_marketcolors(
        up="#16a085",
        down="#e25555",
        edge="inherit",
        wick="inherit",
        volume="inherit",
    )
    style = mpf.make_mpf_style(
        base_mpf_style="nightclouds",
        marketcolors=market_colors,
        facecolor="#111827",
        figcolor="#111827",
        gridcolor="#334155",
        gridstyle="--",
        rc={
            "axes.labelcolor": "#cbd5e1",
            "axes.titlecolor": "#f8fafc",
            "xtick.color": "#94a3b8",
            "ytick.color": "#94a3b8",
            "font.size": 10,
        },
    )
    title = (
        f"{stage} | {symbol} {direction} | {timeframe_label} | "
        f"{captured_at.strftime('%Y-%m-%d %H:%M:%S')} UTC"
    )
    figure, axes = mpf.plot(
        data,
        type="candle",
        style=style,
        volume=True,
        title=title,
        figsize=(14.4, 8.1),
        tight_layout=True,
        returnfig=True,
        warn_too_much_data=500,
    )
    price_axis = axes[0]
    chart_axes = [price_axis]
    if len(axes) > 2:
        chart_axes.append(axes[2])
    for axis in chart_axes:
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
            0.995,
            price,
            f" {label} {price:g} ",
            transform=price_axis.get_yaxis_transform(),
            horizontalalignment="right",
            verticalalignment="bottom",
            color=color,
            fontsize=9,
            bbox={"facecolor": "#111827", "edgecolor": color, "alpha": 0.82, "pad": 1.5},
        )

    marker_price = number_value(
        request.get("exitPrice") if stage == "EXIT" else request.get("entryPrice")
    )
    if marker_price > 0:
        marker = "^" if direction == "BUY" else "v"
        marker_color = "#fbbf24" if stage == "EXIT" else "#60a5fa"
        price_axis.scatter(
            data.index[-1],
            marker_price,
            marker=marker,
            color=marker_color,
            edgecolors="#f8fafc",
            linewidths=0.7,
            s=110,
            zorder=5,
        )

    image = io.BytesIO()
    figure.savefig(image, format="png", dpi=160, facecolor=figure.get_facecolor())
    plt.close(figure)
    image.seek(0)
    return {
        "imageBase64": base64.b64encode(image.read()).decode("ascii"),
        "bars": len(data),
        "timeframe": timeframe_label,
        "capturedAt": captured_at.isoformat(),
    }
