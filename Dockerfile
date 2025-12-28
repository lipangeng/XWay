# ==========================================
# Stage 1: 构建阶段 (编译 TS -> JS)
# ==========================================
FROM node:24-slim AS builder

WORKDIR /app

# 安装构建依赖
COPY package.json package-lock.json ./
RUN npm ci

# 复制源代码
COPY tsconfig.json wrangler.jsonc ./
COPY src ./src

# 使用 Wrangler 进行编译
# --dry-run: 不实际部署到 Cloudflare
# --outdir dist: 将编译产物输出到 dist 目录
RUN npx wrangler deploy --dry-run --outdir dist

RUN npm install -g @cloudflare/workerd-linux-64

# ==========================================
# Stage 2: 运行阶段 (Workerd)
# ==========================================
# 使用包含 glibc 的轻量级镜像，workerd 依赖 libc
FROM debian:trixie-slim

# 安装Tini
ENV TINI_VERSION=v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

WORKDIR /app

# 从构建阶段复制编译好的 JS 文件
COPY --from=builder /usr/local/lib/node_modules/@cloudflare/workerd-linux-64/bin/workerd /usr/local/bin/
COPY --from=builder /app/dist/index.js ./dist/index.js

# 复制 Workerd 配置文件
COPY config.capnp ./config.capnp

# (可选) 如果需要通过环境变量传递配置，可以使用启动脚本动态生成 capnp
# 这里假设配置是静态的

# 暴露端口 (需与 config.capnp 中的 address 对应)
EXPOSE 8080

# 启动 Workerd
CMD ["workerd", "serve", "config.capnp", "--verbose"]
