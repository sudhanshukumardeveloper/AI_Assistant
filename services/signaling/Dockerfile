FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --omit=dev
COPY src ./src
RUN npm install tsx@4.19.0
ENV NODE_ENV=production
EXPOSE 4001
CMD ["npx","tsx","src/index.ts"]
