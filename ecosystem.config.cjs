module.exports = {
  apps: [
    {
      name: "signal-forex",
      cwd: "E:/signal-forex",
      script: "./node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3002",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "tradivix-proxy",
      cwd: "E:/signal-forex",
      script: "E:/signal-forex/tools/caddy/caddy.exe",
      args: "run --config E:/signal-forex/ops/caddy/Caddyfile",
      interpreter: "none",
    },
    {
      name: "tradivix-mt5-bridge",
      cwd: "E:/signal-forex",
      script: "E:/signal-forex/.venv-mt5/Scripts/python.exe",
      args: "workers/mt5_bridge_server.py",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "tradivix-mt5-sync",
      cwd: "E:/signal-forex",
      script: "./node_modules/tsx/dist/cli.mjs",
      args: "src/workers/mt5-sync-worker.ts",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        MT5_DIRECT_SYNC_ENABLED: "true",
      },
    },
    {
      name: "tradivix-ctrader-sync",
      cwd: "E:/signal-forex",
      script: "./node_modules/tsx/dist/cli.mjs",
      args: "src/workers/ctrader-sync-worker.ts",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        CTRADER_DIRECT_SYNC_ENABLED: "true",
      },
    },
  ],
};
