FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --omit=dev
COPY src ./src
RUN npm install tsx@4.19.0
ENV NODE_ENV=production
EXPOSE 4100
EXPOSE 40000-49999/udp
CMD ["npx","tsx","src/index.ts"]
