FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm install --global npm@11.8.0 --no-audit --no-fund && npm ci --no-audit --no-fund
COPY angular.json tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03
ENV BACKEND_UPSTREAM=http://backend:8080
COPY --from=build /workspace/dist/ai-policy-investigator-frontend/browser /usr/share/nginx/html
COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
