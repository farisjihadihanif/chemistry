// PM2: API (sekaligus menyajikan web/dist) + ml-service. Masing-masing 1 proses.
const path = require("path");
const root = path.join(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "chemistry-api",
      cwd: path.join(root, "api"),
      script: "index.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "600M",
      env: { NODE_ENV: "production" },
      out_file: "/var/log/chemistry/api.log",
      error_file: "/var/log/chemistry/api-error.log",
      time: true,
    },
    {
      name: "chemistry-ml",
      cwd: path.join(root, "ml-service"),
      script: path.join(root, "ml-service", ".venv", "bin", "uvicorn"),
      args: "app:app --host 127.0.0.1 --port 5000 --workers 1",
      interpreter: "none",
      max_memory_restart: "1500M",
      out_file: "/var/log/chemistry/ml.log",
      error_file: "/var/log/chemistry/ml-error.log",
      time: true,
    },
  ],
};
