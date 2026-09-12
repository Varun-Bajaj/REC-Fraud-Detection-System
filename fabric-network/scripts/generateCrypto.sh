#!/bin/bash
set -e

# Current directory should be fabric-network root or mapped to /opt/gopath/src/github.com/hyperledger/fabric/peer
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

echo "=== Generating Crypto Material for 4 Organizations + Orderer ==="

rm -rf organizations/ordererOrganizations
rm -rf organizations/peerOrganizations

cryptogen generate --config=./organizations/cryptogen/crypto-config-orderer.yaml --output="organizations"
cryptogen generate --config=./organizations/cryptogen/crypto-config-regulator.yaml --output="organizations"
cryptogen generate --config=./organizations/cryptogen/crypto-config-issuer.yaml --output="organizations"
cryptogen generate --config=./organizations/cryptogen/crypto-config-buyer.yaml --output="organizations"
cryptogen generate --config=./organizations/cryptogen/crypto-config-auditor.yaml --output="organizations"

echo "=== Crypto Material Successfully Generated ==="
