# Site image: builds the Vue app, then serves it with nginx. Requests to /api
# are passed to the API container, so the browser only talks to one origin.
#   docker build -t portfolio-web frontend
#   docker run -p 8080:80 -e API_URL=http://api:8000 portfolio-web

# --- 1. Build ----------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app

# package-lock.json is optional: npm ci when it is there, npm install when not.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

# --- 2. Serve ----------------------------------------------------------------
FROM nginx:1.27-alpine

# The nginx image fills ${API_URL} into templates/*.template at startup.
ENV API_URL=http://backend:8000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1
