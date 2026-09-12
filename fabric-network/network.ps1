# ==============================================================================
# Windows PowerShell Network Script for REC Hyperledger Fabric Network
# ==============================================================================
param (
    [Parameter(Mandatory=$false, Position=0)]
    [string]$Mode = "help"
)

$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $PSScriptRoot

$ChannelName = "rec-channel"
$ComposeFile = "docker/docker-compose-network.yaml"

function Print-Help {
    Write-Host "Usage: .\network.ps1 <Mode>" -ForegroundColor Cyan
    Write-Host "Modes:"
    Write-Host "  up             - Start Orderer, 4 Organization Peers, and CLI containers"
    Write-Host "  createChannel  - Create 'rec-channel' and join all 4 organizations"
    Write-Host "  deployCC       - Package, install, approve, and commit RECContract chaincode"
    Write-Host "  startGateway   - Build and start Node.js Fabric Gateway bridge service (port 5050)"
    Write-Host "  startAll       - Full pipeline: up -> createChannel -> deployCC -> startGateway"
    Write-Host "  down           - Stop and remove all containers and network"
}

function Network-Up {
    Write-Host "=== Starting Docker Network and Fabric Nodes ===" -ForegroundColor Green
    docker compose -f $ComposeFile up -d
}

function Create-Channel {
    Write-Host "=== Creating and Joining Channel '$ChannelName' ===" -ForegroundColor Green
    docker exec cli bash -c "/opt/gopath/src/github.com/hyperledger/fabric/peer/scripts/createChannel.sh"
}

function Deploy-Chaincode {
    Write-Host "=== Deploying REC Contract (CCAAS) ===" -ForegroundColor Green
    docker exec cli bash -c "/opt/gopath/src/github.com/hyperledger/fabric/peer/scripts/deployCC.sh"

    Write-Host "=== Building and Starting Chaincode Container ===" -ForegroundColor Green
    docker build -t rec-contract:1.0 ./chaincode/rec-contract
    docker stop rec-contract 2>$null
    docker rm rec-contract 2>$null
    $pkgId = docker exec cli peer lifecycle chaincode calculatepackageid /opt/gopath/src/github.com/hyperledger/fabric/peer/rec-contract.tar.gz
    docker run -d --name rec-contract --network rec_network `
        -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 `
        -e CHAINCODE_ID=$pkgId `
        -p 9999:9999 rec-contract:1.0
}

function Start-Gateway {
    Write-Host "=== Building and Starting Fabric Gateway Bridge ===" -ForegroundColor Green
    docker build -t fabric-gateway:1.0 ./application/fabric-gateway
    docker stop fabric-gateway 2>$null
    docker rm fabric-gateway 2>$null
    docker run -d --name fabric-gateway --network rec_network `
        -p 5050:5050 `
        -v "$PSScriptRoot\organizations:/usr/src/app/organizations:ro" `
        fabric-gateway:1.0
}

function Network-Down {
    Write-Host "=== Stopping All Fabric & Application Containers ===" -ForegroundColor Yellow
    docker stop fabric-gateway rec-contract 2>$null
    docker rm fabric-gateway rec-contract 2>$null
    docker compose -f $ComposeFile down --volumes --remove-orphans
}

switch ($Mode.ToLower()) {
    "up" { Network-Up }
    "createchannel" { Create-Channel }
    "deploycc" { Deploy-Chaincode }
    "startgateway" { Start-Gateway }
    "startall" {
        Network-Up
        Create-Channel
        Deploy-Chaincode
        Start-Gateway
        Write-Host "=== Hyperledger Fabric REC Network is Ready! ===" -ForegroundColor Green
    }
    "down" { Network-Down }
    default { Print-Help }
}
