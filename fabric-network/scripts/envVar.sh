#!/bin/bash

# envVar.sh - Sets environment variables for the 4 REC organizations

export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/rec.com/orderers/orderer.rec.com/msp/tlscacerts/tlsca.rec.com-cert.pem
export ORDERER_ADMIN_TLS_SIGN_CERT=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/rec.com/orderers/orderer.rec.com/tls/server.crt
export ORDERER_ADMIN_TLS_PRIVATE_KEY=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/rec.com/orderers/orderer.rec.com/tls/server.key

export PEER_CONN_PARMS="--peerAddresses peer0.issuer.rec.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/issuer.rec.com/peers/peer0.issuer.rec.com/tls/ca.crt --peerAddresses peer0.regulator.rec.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulator.rec.com/peers/peer0.regulator.rec.com/tls/ca.crt --peerAddresses peer0.buyer.rec.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/buyer.rec.com/peers/peer0.buyer.rec.com/tls/ca.crt"

setGlobals() {
  local USING_ORG=""
  if [ -z "$1" ]; then
    USING_ORG=$OVERRIDE_ORG
  else
    USING_ORG=$1
  fi
  echo "Using organization ${USING_ORG}"
  if [ "$USING_ORG" = "regulator" ] || [ "$USING_ORG" = "RegulatorOrg" ] || [ "$USING_ORG" = "1" ]; then
    export CORE_PEER_LOCALMSPID="RegulatorOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulator.rec.com/peers/peer0.regulator.rec.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/regulator.rec.com/users/Admin@regulator.rec.com/msp
    export CORE_PEER_ADDRESS=peer0.regulator.rec.com:7051
  elif [ "$USING_ORG" = "issuer" ] || [ "$USING_ORG" = "IssuerOrg" ] || [ "$USING_ORG" = "2" ]; then
    export CORE_PEER_LOCALMSPID="IssuerOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/issuer.rec.com/peers/peer0.issuer.rec.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/issuer.rec.com/users/Admin@issuer.rec.com/msp
    export CORE_PEER_ADDRESS=peer0.issuer.rec.com:8051
  elif [ "$USING_ORG" = "buyer" ] || [ "$USING_ORG" = "BuyerOrg" ] || [ "$USING_ORG" = "3" ]; then
    export CORE_PEER_LOCALMSPID="BuyerOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/buyer.rec.com/peers/peer0.buyer.rec.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/buyer.rec.com/users/Admin@buyer.rec.com/msp
    export CORE_PEER_ADDRESS=peer0.buyer.rec.com:9051
  elif [ "$USING_ORG" = "auditor" ] || [ "$USING_ORG" = "AuditorOrg" ] || [ "$USING_ORG" = "4" ]; then
    export CORE_PEER_LOCALMSPID="AuditorOrgMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/auditor.rec.com/peers/peer0.auditor.rec.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/auditor.rec.com/users/Admin@auditor.rec.com/msp
    export CORE_PEER_ADDRESS=peer0.auditor.rec.com:10051
  else
    echo "Unknown organization: ${USING_ORG}"
  fi
}
