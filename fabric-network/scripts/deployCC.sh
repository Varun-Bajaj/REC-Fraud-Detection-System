#!/bin/bash
set -e

. scripts/envVar.sh

CC_NAME="rec-contract"
CC_VERSION="1.0"
CC_SEQUENCE=1
CHANNEL_NAME="rec-channel"
CC_LABEL="${CC_NAME}_${CC_VERSION}"

echo "=== Packaging Chaincode as a Service (CCAAS) '${CC_NAME}' ==="
mkdir -p /tmp/ccaas/pkg
cat << 'EOF' > /tmp/ccaas/pkg/connection.json
{
  "address": "rec-contract:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF

cat << 'EOF' > /tmp/ccaas/metadata.json
{
  "type": "ccaas",
  "label": "rec-contract_1.0"
}
EOF

tar -C /tmp/ccaas/pkg -czf /tmp/ccaas/code.tar.gz connection.json
tar -C /tmp/ccaas -czf /tmp/ccaas/rec-contract.tar.gz metadata.json code.tar.gz
cp /tmp/ccaas/rec-contract.tar.gz ./rec-contract.tar.gz

echo "=== Installing Chaincode on all 4 Peers ==="
# 1. Regulator
setGlobals "regulator"
peer lifecycle chaincode install rec-contract.tar.gz

# 2. Issuer
setGlobals "issuer"
peer lifecycle chaincode install rec-contract.tar.gz

# 3. Buyer
setGlobals "buyer"
peer lifecycle chaincode install rec-contract.tar.gz

# 4. Auditor
setGlobals "auditor"
peer lifecycle chaincode install rec-contract.tar.gz

# Get Package ID
setGlobals "regulator"
PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid rec-contract.tar.gz)
echo "Chaincode Package ID: $PACKAGE_ID"

echo "=== Approving Chaincode Definition for 4 Organizations ==="
# 1. Regulator
setGlobals "regulator"
peer lifecycle chaincode approveformyorg -o orderer.rec.com:7050 --ordererTLSHostnameOverride orderer.rec.com \
  --tls --cafile "$ORDERER_CA" --channelID "$CHANNEL_NAME" --name "$CC_NAME" --version "$CC_VERSION" \
  --package-id "$PACKAGE_ID" --sequence $CC_SEQUENCE

# 2. Issuer
setGlobals "issuer"
peer lifecycle chaincode approveformyorg -o orderer.rec.com:7050 --ordererTLSHostnameOverride orderer.rec.com \
  --tls --cafile "$ORDERER_CA" --channelID "$CHANNEL_NAME" --name "$CC_NAME" --version "$CC_VERSION" \
  --package-id "$PACKAGE_ID" --sequence $CC_SEQUENCE

# 3. Buyer
setGlobals "buyer"
peer lifecycle chaincode approveformyorg -o orderer.rec.com:7050 --ordererTLSHostnameOverride orderer.rec.com \
  --tls --cafile "$ORDERER_CA" --channelID "$CHANNEL_NAME" --name "$CC_NAME" --version "$CC_VERSION" \
  --package-id "$PACKAGE_ID" --sequence $CC_SEQUENCE

# 4. Auditor
setGlobals "auditor"
peer lifecycle chaincode approveformyorg -o orderer.rec.com:7050 --ordererTLSHostnameOverride orderer.rec.com \
  --tls --cafile "$ORDERER_CA" --channelID "$CHANNEL_NAME" --name "$CC_NAME" --version "$CC_VERSION" \
  --package-id "$PACKAGE_ID" --sequence $CC_SEQUENCE

echo "=== Committing Chaincode Definition to Channel '${CHANNEL_NAME}' ==="
setGlobals "regulator"
peer lifecycle chaincode commit -o orderer.rec.com:7050 --ordererTLSHostnameOverride orderer.rec.com \
  --tls --cafile "$ORDERER_CA" --channelID "$CHANNEL_NAME" --name "$CC_NAME" --version "$CC_VERSION" \
  --sequence $CC_SEQUENCE $PEER_CONN_PARMS

echo "=== Checking Committed Chaincode Status ==="
peer lifecycle chaincode querycommitted --channelID "$CHANNEL_NAME" --name "$CC_NAME"

echo "Chaincode successfully deployed and committed!"
echo "Package ID: $PACKAGE_ID"
