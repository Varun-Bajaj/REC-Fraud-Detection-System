#!/bin/bash
set -e

. scripts/envVar.sh

CHANNEL_NAME="rec-channel"
BLOCKFILE="./channel-artifacts/${CHANNEL_NAME}.block"

echo "=== Creating Genesis Block for Channel '${CHANNEL_NAME}' ==="
mkdir -p channel-artifacts

configtxgen -profile RECChannel -outputBlock "$BLOCKFILE" -channelID "$CHANNEL_NAME"

echo "=== Joining Orderer to Channel '${CHANNEL_NAME}' ==="
osnadmin channel join \
  --channelID "$CHANNEL_NAME" \
  --config-block "$BLOCKFILE" \
  -o orderer.rec.com:7053 \
  --ca-file "$ORDERER_CA" \
  --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" \
  --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY"

sleep 2

echo "=== Joining Peers to Channel '${CHANNEL_NAME}' ==="

# 1. RegulatorOrg
setGlobals "regulator"
peer channel join -b "$BLOCKFILE"

# 2. IssuerOrg
setGlobals "issuer"
peer channel join -b "$BLOCKFILE"

# 3. BuyerOrg
setGlobals "buyer"
peer channel join -b "$BLOCKFILE"

# 4. AuditorOrg
setGlobals "auditor"
peer channel join -b "$BLOCKFILE"

echo "=== All 4 Organizations Joined '${CHANNEL_NAME}' Successfully ==="
