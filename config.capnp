using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    (name = "main", worker = .xwayWorker),
  ],

  sockets = [
    ( name = "http",
      address = "*:8080",
      http = (),
      service = "main"
    ),
  ]
);

const xwayWorker :Workerd.Worker = (
  # 这里的 compatibilityDate 建议与 wrangler.toml 保持一致
  compatibilityDate = "2025-12-02",

  # 开启 ES Module 支持
  modules = [
    (name = "worker", esModule = embed "dist/index.js")
  ],

  # 环境变量绑定 (对应 wrangler.toml 中的 [vars])
  # 如果您的代码中有使用 env.REMOTE_CONFIG_URL_01，必须在这里显式绑定
  bindings = [
    (name = "ROUTE_MODE", text = "auto"),
  ],
);
