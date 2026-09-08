def collect_symbol_infos(mt5, *collections):
    names = {
        str(item.symbol).strip()
        for collection in collections
        for item in collection
        if getattr(item, "symbol", None) and str(item.symbol).strip()
    }
    return [info for name in sorted(names) for info in [mt5.symbol_info(name)] if info is not None]
