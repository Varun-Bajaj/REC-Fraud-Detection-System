FROM node:18-bullseye-slim

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY src/ ./src/
RUN npm run build

EXPOSE 5050
ENV PORT=5050
ENV GATEWAY_PEER_HOST=docker
ENV ORGANIZATIONS_DIR=/usr/src/app/organizations

CMD ["npm", "start"]
