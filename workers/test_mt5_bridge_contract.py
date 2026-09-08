import unittest
from collections import namedtuple

from mt5_bridge_contract import collect_symbol_infos


Item = namedtuple("Item", ["symbol"])
Symbol = namedtuple(
    "Symbol",
    ["name", "trade_contract_size", "trade_tick_size", "trade_tick_value", "digits", "currency_base", "currency_profit"],
)


class FakeMt5:
    def __init__(self):
        self.requested = []

    def symbol_info(self, name):
        self.requested.append(name)
        return Symbol(name, 100, 0.01, 1, 2, "XAU", "USD")


class BridgeContractTest(unittest.TestCase):
    def test_collects_symbols_from_every_source_and_deduplicates(self):
        mt5 = FakeMt5()
        symbols = collect_symbol_infos(
            mt5,
            [Item("XAUUSD")],
            [Item("EURUSD")],
            [Item("XAUUSD")],
            [Item("")],
        )
        self.assertEqual(mt5.requested, ["EURUSD", "XAUUSD"])
        self.assertEqual([item.name for item in symbols], ["EURUSD", "XAUUSD"])
        self.assertGreater(symbols[1].trade_tick_size, 0)
        self.assertGreater(symbols[1].trade_tick_value, 0)


if __name__ == "__main__":
    unittest.main()
