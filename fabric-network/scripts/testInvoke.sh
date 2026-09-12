#!/bin/bash
set -e

. scripts/envVar.sh

echo "=== 1. Issuing REC-000004 (IssuerOrg) ==="
setGlobals "issuer"

peer chaincode invoke \
  -o orderer.rec.com:7050 \
  --ordererTLSHostnameOverride orderer.rec.com \
  --tls \
  --cafile "$ORDERER_CA" \
  -C rec-channel \
  -n rec-contract \
  --waitForEvent \
  $PEER_CONN_PARMS \
  -c '{"function":"RECContract:createREC","Args":["REC-000004","GEN-001","SOLAR","2026-09-10","100.0","100","e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"]}'

echo "=== 2. Querying REC-000004 (AuditorOrg) ==="
setGlobals "auditor"

peer chaincode query \
  -C rec-channel \
  -n rec-contract \
  -c '{"function":"RECContract:getREC","Args":["REC-000004"]}'

echo ""
echo "=== 3. Transferring 40 REC from ISSUER-ORG to BUYER-A ==="
setGlobals "issuer"

peer chaincode invoke \
  -o orderer.rec.com:7050 \
  --ordererTLSHostnameOverride orderer.rec.com \
  --tls \
  --cafile "$ORDERER_CA" \
  -C rec-channel \
  -n rec-contract \
  --waitForEvent \
  $PEER_CONN_PARMS \
  -c '{"function":"RECContract:transferREC","Args":["REC-000004","ISSUER-ORG","BUYER-A","40","TX-REF-001"]}'

echo "=== 4. Retiring 20 REC by BUYER-A ==="
setGlobals "buyer"

peer chaincode invoke \
  -o orderer.rec.com:7050 \
  --ordererTLSHostnameOverride orderer.rec.com \
  --tls \
  --cafile "$ORDERER_CA" \
  -C rec-channel \
  -n rec-contract \
  --waitForEvent \
  $PEER_CONN_PARMS \
  -c '{"function":"RECContract:retireREC","Args":["REC-000004","BUYER-A","20","Scope 2 Compliance"]}'

echo "=== 5. Querying Verification and Full History (AuditorOrg) ==="
setGlobals "auditor"

peer chaincode query \
  -C rec-channel \
  -n rec-contract \
  -c '{"function":"RECContract:verifyREC","Args":["REC-000004"]}'

echo ""
peer chaincode query \
  -C rec-channel \
  -n rec-contract \
  -c '{"function":"RECContract:getRECHistory","Args":["REC-000004"]}'

echo ""
echo "=== All Direct Chaincode Tests Succeeded on Ledger! ==="
