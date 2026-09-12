FROM node:18-bullseye-slim

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY src/ ./src/
RUN npm run build

EXPOSE 9999

ENV PORT=9999
ENV CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999

CMD ["npm", "run", "start"]
