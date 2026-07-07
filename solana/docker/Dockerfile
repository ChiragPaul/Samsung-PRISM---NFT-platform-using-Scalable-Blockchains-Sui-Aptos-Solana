# --- Stage 1: build the static SPA ---
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first for better layer caching.
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci || npm install

# Build-time public config (baked into the bundle by Vite).
ARG VITE_RPC_URL=https://api.devnet.solana.com
ARG VITE_RPC_WS_URL=
ARG VITE_PROGRAM_ID=6MAZYi6WaiB8ztJuJjoAVkbQDxZxfuQuJR3KfrfZncih
ARG VITE_NETWORK=devnet
ARG VITE_MARKETPLACE_NAME=devnet-marketplace
ARG VITE_FEATURE_OFFERS=false
ENV VITE_RPC_URL=$VITE_RPC_URL \
    VITE_RPC_WS_URL=$VITE_RPC_WS_URL \
    VITE_PROGRAM_ID=$VITE_PROGRAM_ID \
    VITE_NETWORK=$VITE_NETWORK \
    VITE_MARKETPLACE_NAME=$VITE_MARKETPLACE_NAME \
    VITE_FEATURE_OFFERS=$VITE_FEATURE_OFFERS

COPY client/ ./client/
RUN cd client && npm run build

# --- Stage 2: serve with nginx ---
FROM nginx:1.27-alpine AS runtime
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
