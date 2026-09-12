import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Gateway, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type OrgType = 'regulator' | 'issuer' | 'buyer' | 'auditor';

export interface FabricConfig {
  channelName: string;
  chaincodeName: string;
  organizationsDir: string;
  gatewayHost: string; // e.g. "localhost" or Docker service name
}

export class FabricGatewayManager {
  private config: FabricConfig;
  private gateways: Map<OrgType, { gateway: Gateway; contract: Contract; client: grpc.Client }> = new Map();

  constructor(config?: Partial<FabricConfig>) {
    const rootDir = path.resolve(__dirname, '../../..');
    this.config = {
      channelName: process.env.CHANNEL_NAME || 'rec-channel',
      chaincodeName: process.env.CHAINCODE_NAME || 'rec-contract',
      organizationsDir: process.env.ORGANIZATIONS_DIR || path.join(rootDir, 'organizations'),
      gatewayHost: process.env.GATEWAY_PEER_HOST || 'localhost',
      ...config,
    };
  }

  private getOrgDetails(org: OrgType) {
    const orgMap: Record<OrgType, { mspId: string; domain: string; peerPort: number; peerHost: string }> = {
      regulator: {
        mspId: 'RegulatorOrgMSP',
        domain: 'regulator.rec.com',
        peerPort: 7051,
        peerHost: 'peer0.regulator.rec.com',
      },
      issuer: {
        mspId: 'IssuerOrgMSP',
        domain: 'issuer.rec.com',
        peerPort: 8051,
        peerHost: 'peer0.issuer.rec.com',
      },
      buyer: {
        mspId: 'BuyerOrgMSP',
        domain: 'buyer.rec.com',
        peerPort: 9051,
        peerHost: 'peer0.buyer.rec.com',
      },
      auditor: {
        mspId: 'AuditorOrgMSP',
        domain: 'auditor.rec.com',
        peerPort: 10051,
        peerHost: 'peer0.auditor.rec.com',
      },
    };
    return orgMap[org];
  }

  private findPrivateKey(userKeystoreDir: string): string {
    const files = fs.readdirSync(userKeystoreDir);
    const keyFile = files.find(f => f.endsWith('_sk') || f.endsWith('.key') || f.includes('priv_sk'));
    if (!keyFile) {
      // Return the first file in keystore if none matches standard extension
      return path.join(userKeystoreDir, files[0]);
    }
    return path.join(userKeystoreDir, keyFile);
  }

  public async getContract(org: OrgType = 'issuer'): Promise<{ contract: Contract; gateway: Gateway }> {
    if (this.gateways.has(org)) {
      const cached = this.gateways.get(org)!;
      return { contract: cached.contract, gateway: cached.gateway };
    }

    const { mspId, domain, peerPort, peerHost } = this.getOrgDetails(org);
    const orgDir = path.join(this.config.organizationsDir, 'peerOrganizations', domain);

    const tlsCertPath = path.join(orgDir, 'peers', peerHost, 'tls', 'ca.crt');
    const userCertPath = path.join(orgDir, 'users', `User1@${domain}`, 'msp', 'signcerts', `User1@${domain}-cert.pem`);
    const adminCertPath = path.join(orgDir, 'users', `Admin@${domain}`, 'msp', 'signcerts', `Admin@${domain}-cert.pem`);

    // Prefer User1 certificate, fallback to Admin
    let certPath = fs.existsSync(userCertPath) ? userCertPath : adminCertPath;
    let keystoreDir = fs.existsSync(userCertPath)
      ? path.join(orgDir, 'users', `User1@${domain}`, 'msp', 'keystore')
      : path.join(orgDir, 'users', `Admin@${domain}`, 'msp', 'keystore');

    const keyPath = this.findPrivateKey(keystoreDir);

    const tlsRootCert = fs.readFileSync(tlsCertPath);
    const cert = fs.readFileSync(certPath);
    const privateKeyPem = fs.readFileSync(keyPath);

    const identity: Identity = {
      mspId,
      credentials: cert,
    };

    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const signer: Signer = signers.newPrivateKeySigner(privateKey);

    // Determine target host & port (container network uses peerHost, external uses gatewayHost:port)
    const targetEndpoint = this.config.gatewayHost === 'localhost' || this.config.gatewayHost === '127.0.0.1'
      ? `localhost:${peerPort}`
      : `${peerHost}:${peerPort}`;

    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    const client = new grpc.Client(targetEndpoint, tlsCredentials, {
      'grpc.ssl_target_name_override': peerHost,
    });

    const gateway = connect({
      client,
      identity,
      signer,
      evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
      endorseOptions: () => ({ deadline: Date.now() + 15000 }),
      submitOptions: () => ({ deadline: Date.now() + 15000 }),
      commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
    });

    const network = gateway.getNetwork(this.config.channelName);
    const contract = network.getContract(this.config.chaincodeName);

    this.gateways.set(org, { gateway, contract, client });
    return { contract, gateway };
  }

  public async closeAll(): Promise<void> {
    for (const [org, entry] of this.gateways.entries()) {
      entry.gateway.close();
      entry.client.close();
    }
    this.gateways.clear();
  }
}
