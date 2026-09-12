#!/bin/bash
# ==============================================================================
# Hyperledger Fabric Network Control Script for REC Fraud Detection System
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

MODE=$1
CHANNEL_NAME="rec-channel"
COMPOSE_FILE="docker/docker-compose-network.yaml"

function printHelp() {
  echo "Usage: ./network.sh <Mode>"
  echo "Modes:"
  echo "  up             - Start Orderer, 4 Organization Peers, and CLI containers"
  echo "  createChannel  - Create 'rec-channel' and join all 4 organizations"
  echo "  deployCC       - Package, install, approve, and commit RECContract chaincode"
  echo "  startGateway   - Build and start Node.js Fabric Gateway bridge service (port 5050)"
  echo "  startAll       - Full pipeline: up -> createChannel -> deployCC -> startGateway"
  echo "  down           - Stop and remove all containers and network"
}

function networkUp() {
  echo "=== Step 1: Generating Cryptographic Material (if missing) ==="
  if [ ! -d "organizations/peerOrganizations" ]; then
    bash scripts/generateCrypto.sh
  fi

  echo "=== Step 2: Starting Docker Network and Fabric Nodes ==="
  docker compose -f "$COMPOSE_FILE" up -d
  echo "Peers and Orderer running."
}

function createChannel() {
  echo "=== Step 3: Creating and Joining '${CHANNEL_NAME}' ==="
  docker exec cli bash -c "/opt/gopath/src/github.com/hyperledger/fabric/peer/scripts/createChannel.sh"
}

function deployChaincode() {
  echo "=== Step 4: Deploying REC Contract (CCAAS) ==="
  docker exec cli bash -c "/opt/gopath/src/github.com/hyperledger/fabric/peer/scripts/deployCC.sh"

  echo "=== Step 5: Building and Starting Chaincode Container ==="
  docker build -t rec-contract:1.0 ./chaincode/rec-contract
  docker stop rec-contract 2>/dev/null || true
  docker rm rec-contract 2>/dev/null || true
  docker run -d --name rec-contract --network rec_network \
    -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
    -e CHAINCODE_ID=$(docker exec cli peer lifecycle chaincode calculatepackageid /opt/gopath/src/github.com/hyperledger/fabric/peer/rec-contract.tar.gz) \
    -p 9999:9999 rec-contract:1.0
  echo "Chaincode container running on port 9999."
}

function startGateway() {
  echo "=== Step 6: Building and Starting Fabric Gateway Bridge ==="
  docker build -t fabric-gateway:1.0 ./application/fabric-gateway
  docker stop fabric-gateway 2>/dev/null || true
  docker rm fabric-gateway 2>/dev/null || true
  docker run -d --name fabric-gateway --network rec_network \
    -p 5050:5050 \
    -v "${DIR}/organizations:/usr/src/app/organizations:ro" \
    fabric-gateway:1.0
  echo "Fabric Gateway Bridge running on port 5050."
}

function networkDown() {
  echo "=== Stopping All Fabric & Application Containers ==="
  docker stop fabric-gateway rec-contract 2>/dev/null || true
  docker rm fabric-gateway rec-contract 2>/dev/null || true
  docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans
  echo "Fabric Network successfully stopped."
}

if [ "$MODE" == "up" ]; then
  networkUp
elif [ "$MODE" == "createChannel" ]; then
  createChannel
elif [ "$MODE" == "deployCC" ]; then
  deployChaincode
elif [ "$MODE" == "startGateway" ]; then
  startGateway
elif [ "$MODE" == "startAll" ]; then
  networkUp
  createChannel
  deployChaincode
  startGateway
  echo "=== Real Hyperledger Fabric REC Network is Ready! ==="
elif [ "$MODE" == "down" ]; then
  networkDown
else
  printHelp
fi
