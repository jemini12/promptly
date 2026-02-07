FROM golang:1.25-alpine AS builder
WORKDIR /worker
COPY worker/go.mod ./go.mod
COPY worker/main.go ./main.go
RUN go mod tidy && go build -o promptly-worker .

FROM alpine:3.21
WORKDIR /worker
RUN adduser -D -u 10001 appuser
COPY --from=builder /worker/promptly-worker /worker/promptly-worker
USER appuser
CMD ["/worker/promptly-worker"]
