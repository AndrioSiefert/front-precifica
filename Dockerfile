# ====== build ======
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .


ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL


RUN npm run build



# ====== runtime ======
FROM node:24-alpine
WORKDIR /app

# Vite gera dist/
COPY --from=builder /app/dist ./dist

RUN npm i -g serve

EXPOSE 3250
# -s = SPA fallback (React Router)
CMD ["serve", "-s", "dist", "-l", "3250"]


# docker build \
#   --build-arg VITE_API_URL=https://api.precifica.gestaosincronia.com.br \
#   -t precifica-front:latest \
#   -f Dockerfile .
