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
        fake_mt5.login.return_value = False
        fake_mt5.last_error.return_value = (-6, "Terminal: Authorization failed")

        with (
            patch.object(bridge, "mt5", fake_mt5),
            patch.object(session, "connected_account", return_value=None),
            patch.object(session, "wait_for_connection", return_value=None),
        ):
            account = session.authorize(
                self.terminal_path,
                123,
                "secret",
                "Broker-Server",
                allow_account_switch=True,
            )

        self.assertIsNone(account)
        self.assertEqual(session.last_auth_error, (-6, "Terminal: Authorization failed"))
        fake_mt5.login.assert_called_once_with(
            123,
            password="secret",
            server="Broker-Server",
            timeout=15000,
        )

    def test_snapshot_forces_password_validation_for_an_already_connected_account(self):
        session = bridge.TerminalSession()
        fake_mt5 = Mock()
        connected = Mock()
        fake_mt5.login.return_value = True

        with (
            patch.object(bridge, "mt5", fake_mt5),
            patch.object(session, "connected_account", return_value=connected),
            patch.object(session, "wait_for_connection", return_value=connected),
        ):
            account = session.authorize(
                self.terminal_path,
                123,
                "secret",
                "Broker-Server",
                allow_account_switch=True,
            )

        self.assertIs(account, connected)
        fake_mt5.login.assert_called_once_with(
            123,
            password="secret",
            server="Broker-Server",
            timeout=15000,
        )

    def test_background_sync_never_switches_the_active_terminal_account(self):
        session = bridge.TerminalSession()
        fake_mt5 = Mock()

        with (
            patch.object(bridge, "mt5", fake_mt5),
            patch.object(session, "connected_account", return_value=None),
        ):
            account = session.authorize(
                self.terminal_path,
                123,
                "secret",
                "Broker-Server",
                allow_account_switch=False,
            )

        self.assertIsNone(account)
        fake_mt5.login.assert_not_called()

    def test_sync_reports_inactive_account_without_switching_accounts(self):
        session = bridge.TerminalSession()
        active_account = Mock(login=999)
        fake_mt5 = Mock()
        fake_mt5.account_info.return_value = active_account
        fake_mt5.last_error.return_value = (1, "Success")

        with (
            patch.object(bridge, "mt5", fake_mt5),
            patch.object(session, "ensure_initialized", return_value=True),
            patch.object(session, "connected_account", return_value=None),
        ):
            result = session.execute(
                {
                    "operation": "sync",
                    "terminalPath": self.terminal_path,
                    "login": "123",
                    "password": "secret",
                    "server": "Broker-Server",
                    "from": "2026-01-01T00:00:00Z",
                    "to": "2026-01-02T00:00:00Z",
                }
            )

        self.assertFalse(result["ok"])
        self.assertEqual(result["errorCode"], "MT5_ACCOUNT_NOT_ACTIVE")
        fake_mt5.login.assert_not_called()

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
