import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { FabricGatewayManager, OrgType } from './gatewayClient';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

const gatewayManager = new FabricGatewayManager();

// Helper to parse utf8 bytes from fabric evaluate/submit
const parseResponse = (resultBytes: Uint8Array): any => {
  const str = Buffer.from(resultBytes).toString('utf8');
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

// Helper to extract detailed peer endorsement errors from Fabric Gateway
const extractErrorMessage = (err: any): string => {
  let msg = err.message || String(err);
  if (err.details && Array.isArray(err.details)) {
    const detailsStr = err.details.map((d: any) => d.message || JSON.stringify(d)).join('; ');
    if (detailsStr) msg += ` - ${detailsStr}`;
  }
  return msg;
};

// Healthcheck
app.get('/health', async (req: Request, res: Response) => {
  try {
    const { contract } = await gatewayManager.getContract('auditor');
    res.json({
      status: 'UP',
      network: 'Hyperledger Fabric v2.5',
      channel: process.env.CHANNEL_NAME || 'rec-channel',
      chaincode: process.env.CHAINCODE_NAME || 'rec-contract',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'DOWN', error: extractErrorMessage(err) });
  }
});

// Create REC
app.post('/api/fabric/create-rec', async (req: Request, res: Response) => {
  try {
    const {
      recId,
      generatorId,
      energySource,
      generationDate,
      generationMWh,
      issuedQuantity,
      documentHash,
      callerOrg,
    } = req.body;

    if (!recId || !generatorId || !energySource || !generationDate || !generationMWh || !issuedQuantity || !documentHash) {
      return res.status(400).json({
        error: 'Missing required fields: recId, generatorId, energySource, generationDate, generationMWh, issuedQuantity, documentHash',
      });
    }

    const org: OrgType = (callerOrg as OrgType) || 'issuer';
    const { contract } = await gatewayManager.getContract(org);
    const resultBytes = await contract.submitTransaction(
      'createREC',
      String(recId),
      String(generatorId),
      String(energySource),
      String(generationDate),
      String(generationMWh),
      String(issuedQuantity),
      String(documentHash)
    );

    const asset = parseResponse(resultBytes);
    return res.status(201).json({ success: true, asset });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: extractErrorMessage(err) });
  }
});

// Transfer REC
app.post('/api/fabric/transfer-rec', async (req: Request, res: Response) => {
  try {
    const { recId, fromOwner, toOwner, quantity, transactionReference, callerOrg } = req.body;

    if (!recId || !fromOwner || !toOwner || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: recId, fromOwner, toOwner, quantity' });
    }

    const org: OrgType = (callerOrg as OrgType) || 'buyer';
    const { contract } = await gatewayManager.getContract(org);

    const resultBytes = await contract.submitTransaction(
      'transferREC',
      String(recId),
      String(fromOwner),
      String(toOwner),
      String(quantity),
      String(transactionReference || '')
    );

    const asset = parseResponse(resultBytes);
    return res.json({ success: true, asset });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: extractErrorMessage(err) });
  }
});

// Retire REC
app.post('/api/fabric/retire-rec', async (req: Request, res: Response) => {
  try {
    const { recId, owner, quantity, retirementReason, callerOrg } = req.body;

    if (!recId || !owner || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: recId, owner, quantity' });
    }

    const org: OrgType = (callerOrg as OrgType) || 'buyer';
    const { contract } = await gatewayManager.getContract(org);

    const resultBytes = await contract.submitTransaction(
      'retireREC',
      String(recId),
      String(owner),
      String(quantity),
      String(retirementReason || 'Voluntary Scope 2 Offset')
    );

    const asset = parseResponse(resultBytes);
    return res.json({ success: true, asset });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: extractErrorMessage(err) });
  }
});

// Cancel REC
app.post('/api/fabric/cancel-rec', async (req: Request, res: Response) => {
  try {
    const { recId, reason, callerOrg } = req.body;

    if (!recId) {
      return res.status(400).json({ error: 'Missing recId' });
    }

    const org: OrgType = (callerOrg as OrgType) || 'regulator';
    const { contract } = await gatewayManager.getContract(org);

    const resultBytes = await contract.submitTransaction(
      'cancelREC',
      String(recId),
      String(reason || 'Regulatory Directive')
    );

    const asset = parseResponse(resultBytes);
    return res.json({ success: true, asset });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: extractErrorMessage(err) });
  }
});

// Get REC State
app.get('/api/fabric/rec/:recId', async (req: Request, res: Response) => {
  try {
    const { recId } = req.params;
    const { contract } = await gatewayManager.getContract('auditor');
    const resultBytes = await contract.evaluateTransaction('getREC', recId);
    const asset = parseResponse(resultBytes);
    return res.json({ success: true, asset });
  } catch (err: any) {
    return res.status(404).json({ success: false, error: err.message });
  }
});

// Get REC History
app.get('/api/fabric/rec/:recId/history', async (req: Request, res: Response) => {
  try {
    const { recId } = req.params;
    const { contract } = await gatewayManager.getContract('auditor');
    const resultBytes = await contract.evaluateTransaction('getRECHistory', recId);
    const history = parseResponse(resultBytes);
    return res.json({ success: true, recId, history });
  } catch (err: any) {
    return res.status(404).json({ success: false, error: err.message });
  }
});

// Verify REC
app.get('/api/fabric/rec/:recId/verify', async (req: Request, res: Response) => {
  try {
    const { recId } = req.params;
    const { contract } = await gatewayManager.getContract('auditor');
    const resultBytes = await contract.evaluateTransaction('verifyREC', recId);
    const verification = parseResponse(resultBytes);
    return res.json({ success: true, verification });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Fabric Gateway Bridge listening on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server and Fabric Gateway connections');
  server.close(async () => {
    await gatewayManager.closeAll();
    process.exit(0);
  });
});
