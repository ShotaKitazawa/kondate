# Stage 1: Build frontend
FROM node:24-alpine AS frontend-builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm run build

# Stage 2: Build backend (with embedded frontend)
FROM golang:1.26-alpine AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./static
RUN CGO_ENABLED=0 GOOS=linux go build -o kondate ./main.go

# Stage 3: Runtime
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=backend-builder /app/kondate /kondate
EXPOSE 8080
ENTRYPOINT ["/kondate"]
