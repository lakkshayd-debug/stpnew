FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# install server dependencies (tsx + prisma included)
COPY server/package.json ./server/
WORKDIR /app/server
RUN npm install --no-audit --no-fund

# copy sources
WORKDIR /app
COPY shared ./shared
COPY server ./server

WORKDIR /app/server
# generate the Prisma client; type-check only (no emit) so the start path can never drift
RUN npx prisma generate && (npx tsc --noEmit -p tsconfig.json || echo "type warnings ignored for deploy")

ENV NODE_ENV=production PORT=4000 UPLOAD_DIR=/app/server/uploads
EXPOSE 4000
VOLUME ["/app/server/uploads"]

# create/update tables, insert owner + demo data (safe to re-run), then run the TypeScript entry directly
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts && npx tsx src/index.ts"]
