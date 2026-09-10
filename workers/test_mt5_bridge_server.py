import unittest
from unittest.mock import Mock, patch

import mt5_bridge_server as bridge


class TerminalSessionTests(unittest.TestCase):
    def setUp(self):
        self.terminal_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"

    def test_closed_terminal_is_never_initialized_or_launched(self):
        session = bridge.TerminalSession()
        session.initialized = True
        session.terminal_path = self.terminal_path
        fake_mt5 = Mock()

        with (
            patch.object(bridge, "mt5", fake_mt5),
            patch.object(bridge, "terminal_process_is_running", return_value=False),
        ):
            initialized = session.ensure_initialized(self.terminal_path, 123, "secret", "Broker-Server")

        self.assertFalse(initialized)
        self.assertFalse(session.initialized)
        fake_mt5.shutdown.assert_called_once_with()
        fake_mt5.initialize.assert_not_called()

    def test_running_terminal_can_be_attached(self):
        session = bridge.TerminalSession()
        fake_mt5 = Mock()
        fake_mt5.initialize.return_value = True

        with (
            patch.object(bridge, "mt5", fake_mt5),
            patch.object(bridge, "terminal_process_is_running", return_value=True),
        ):
            initialized = session.ensure_initialized(self.terminal_path, 123, "secret", "Broker-Server")

        self.assertTrue(initialized)
        self.assertTrue(session.initialized)
        fake_mt5.initialize.assert_called_once_with(self.terminal_path, timeout=30000)

    def test_failed_login_does_not_restart_terminal(self):
        session = bridge.TerminalSession()
        fake_mt5 = Mock()

        with (
            patch.object(bridge, "mt5", fake_mt5),
            patch.object(session, "connected_account", return_value=None),
            patch.object(session, "wait_for_connection", return_value=None),
        ):
            account = session.authorize(self.terminal_path, 123, "secret", "Broker-Server")

        self.assertIsNone(account)
        fake_mt5.login.assert_called_once_with(
            123,
            password="secret",
            server="Broker-Server",
            timeout=15000,
        )

    def test_execute_reports_manual_start_requirement_when_closed(self):
        session = bridge.TerminalSession()
        fake_mt5 = Mock()

        with (
            patch.object(bridge, "mt5", fake_mt5),
            patch.object(bridge, "terminal_process_is_running", return_value=False),
        ):
            result = session.execute(
                {
                    "terminalPath": self.terminal_path,
                    "login": "123",
                    "password": "secret",
                    "server": "Broker-Server",
                }
            )

        self.assertFalse(result["ok"])
        self.assertEqual(result["errorCode"], "MT5_TERMINAL_CLOSED")
        fake_mt5.initialize.assert_not_called()


if __name__ == "__main__":
    unittest.main()

