FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY client/package.json ./client/
WORKDIR /app/client
RUN npm install --no-audit --no-fund
WORKDIR /app
COPY shared ./shared
COPY client ./client
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app/client
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/client/dist /usr/share/nginx/html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location / { try_files $uri $uri/ /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
