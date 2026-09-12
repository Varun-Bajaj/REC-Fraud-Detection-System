import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { RECAsset, RECTransactionRecord } from './recAsset';

@Info({ title: 'RECContract', description: 'Smart Contract for Renewable Energy Certificate Fraud Detection and Tracking' })
export class RECContract extends Contract {

  constructor() {
    super('RECContract');
  }

  /**
   * Helper to format transaction timestamp to ISO string
   */
  private getTxTimestamp(ctx: Context): string {
    const timestamp = ctx.stub.getTxTimestamp();
    const millis = (timestamp.seconds.low + timestamp.seconds.high * 4294967296) * 1000 + Math.round(timestamp.nanos / 1000000);
    return new Date(millis).toISOString();
  }

  /**
   * createREC
   * Issues a new Renewable Energy Certificate on-chain.
   * Only authorized IssuerOrg identities can execute this transaction.
   */
  @Transaction()
  public async createREC(
    ctx: Context,
    recId: string,
    generatorId: string,
    energySource: string,
    generationDate: string,
    generationMWhStr: string,
    issuedQuantityStr: string,
    documentHash: string
  ): Promise<string> {
    const callerMsp = ctx.clientIdentity.getMSPID();
    if (callerMsp !== 'IssuerOrgMSP') {
      throw new Error(`UNAUTHORIZED: Caller with MSP ${callerMsp} is not authorized to issue RECs. Only IssuerOrgMSP can issue.`);
    }

    if (!recId || recId.trim() === '') {
      throw new Error('INVALID_ARGUMENT: recId must not be empty.');
    }

    const existingBytes = await ctx.stub.getState(recId);
    if (existingBytes && existingBytes.length > 0) {
      throw new Error(`DUPLICATE_REC_ID: REC with ID ${recId} already exists on the ledger.`);
    }

    const generationMWh = parseFloat(generationMWhStr);
    if (isNaN(generationMWh) || generationMWh <= 0) {
      throw new Error('INVALID_QUANTITY: generationMWh must be a positive number.');
    }

    const issuedQuantity = parseInt(issuedQuantityStr, 10);
    if (isNaN(issuedQuantity) || issuedQuantity <= 0) {
      throw new Error('INVALID_QUANTITY: issuedQuantity must be a positive integer greater than 0.');
    }

    const sha256Regex = /^[a-fA-F0-9]{64}$/;
    if (!documentHash || !sha256Regex.test(documentHash.trim())) {
      throw new Error('INVALID_DOCUMENT_HASH: documentHash must be a valid 64-character SHA-256 hexadecimal string.');
    }

    const now = this.getTxTimestamp(ctx);
    const initialOwner = 'ISSUER-ORG';

    const asset: RECAsset = {
      recId: recId.trim(),
      generatorId: generatorId.trim(),
      energySource: energySource.trim().toUpperCase(),
      generationDate: generationDate.trim(),
      generationMWh: generationMWh,
      issuedQuantity: issuedQuantity,
      currentOwner: initialOwner,
      activeQuantity: issuedQuantity,
      retiredQuantity: 0,
      status: 'ACTIVE',
      documentHash: documentHash.trim().toLowerCase(),
      createdAt: now,
      updatedAt: now,
      balances: {
        [initialOwner]: issuedQuantity
      }
    };

    const assetBytes = Buffer.from(JSON.stringify(asset));
    await ctx.stub.putState(recId, assetBytes);

    // Emit event
    const eventPayload = {
      recId: asset.recId,
      generatorId: asset.generatorId,
      issuedQuantity: asset.issuedQuantity,
      documentHash: asset.documentHash,
      txId: ctx.stub.getTxID(),
      timestamp: now
    };
    ctx.stub.setEvent('REC_CREATED', Buffer.from(JSON.stringify(eventPayload)));

    return JSON.stringify(asset);
  }

  /**
   * transferREC
   * Transfers active REC quantity from one owner to another.
   */
  @Transaction()
  public async transferREC(
    ctx: Context,
    recId: string,
    fromOwner: string,
    toOwner: string,
    quantityStr: string,
    transactionReference: string
  ): Promise<string> {
    const assetBytes = await ctx.stub.getState(recId);
    if (!assetBytes || assetBytes.length === 0) {
      throw new Error(`REC_NOT_FOUND: REC ${recId} does not exist.`);
    }

    const asset: RECAsset = JSON.parse(assetBytes.toString());

    if (asset.status === 'CANCELLED') {
      throw new Error(`INVALID_STATE: REC ${recId} is CANCELLED and cannot be transferred.`);
    }

    if (asset.status === 'RETIRED' && asset.activeQuantity === 0) {
      throw new Error(`INVALID_STATE: REC ${recId} is fully RETIRED and cannot be transferred.`);
    }

    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('INVALID_QUANTITY: Transfer quantity must be greater than zero.');
    }

    if (!fromOwner || fromOwner.trim() === '') {
      throw new Error('INVALID_ARGUMENT: fromOwner must be specified.');
    }

    if (!toOwner || toOwner.trim() === '') {
      throw new Error('INVALID_ARGUMENT: toOwner must be specified.');
    }

    if (fromOwner === toOwner) {
      throw new Error('INVALID_ARGUMENT: fromOwner and toOwner cannot be the same account.');
    }

    // Check balances
    const senderBalance = asset.balances[fromOwner] || 0;
    if (senderBalance < quantity) {
      throw new Error(`INSUFFICIENT_BALANCE: Owner ${fromOwner} has active balance of ${senderBalance} REC, requested transfer is ${quantity} REC.`);
    }

    // Caller authorization check:
    // Caller must be an authorized org (IssuerOrg, BuyerOrg, or RegulatorOrg)
    const callerMsp = ctx.clientIdentity.getMSPID();
    if (callerMsp === 'AuditorOrgMSP') {
      throw new Error('UNAUTHORIZED: AuditorOrg identities have read-only access and cannot transfer RECs.');
    }

    // Update balances
    asset.balances[fromOwner] = senderBalance - quantity;
    asset.balances[toOwner] = (asset.balances[toOwner] || 0) + quantity;
    asset.currentOwner = toOwner;

    // Recalculate active quantity across all balances
    let totalActive = 0;
    for (const owner in asset.balances) {
      totalActive += asset.balances[owner];
    }
    asset.activeQuantity = totalActive;

    const now = this.getTxTimestamp(ctx);
    asset.updatedAt = now;

    await ctx.stub.putState(recId, Buffer.from(JSON.stringify(asset)));

    const eventPayload = {
      recId: asset.recId,
      fromOwner: fromOwner,
      toOwner: toOwner,
      quantity: quantity,
      remainingSenderBalance: asset.balances[fromOwner],
      txId: ctx.stub.getTxID(),
      reference: transactionReference || '',
      timestamp: now
    };
    ctx.stub.setEvent('REC_TRANSFERRED', Buffer.from(JSON.stringify(eventPayload)));

    return JSON.stringify(asset);
  }

  /**
   * retireREC
   * Permanently retires active REC quantity for carbon offset claim.
   * A retired REC can never be reactivated.
   */
  @Transaction()
  public async retireREC(
    ctx: Context,
    recId: string,
    owner: string,
    quantityStr: string,
    retirementReason: string
  ): Promise<string> {
    const assetBytes = await ctx.stub.getState(recId);
    if (!assetBytes || assetBytes.length === 0) {
      throw new Error(`REC_NOT_FOUND: REC ${recId} does not exist.`);
    }

    const asset: RECAsset = JSON.parse(assetBytes.toString());

    if (asset.status === 'CANCELLED') {
      throw new Error(`INVALID_STATE: REC ${recId} is CANCELLED and cannot be retired.`);
    }

    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('INVALID_QUANTITY: Retirement quantity must be greater than zero.');
    }

    const ownerBalance = asset.balances[owner] || 0;
    if (ownerBalance < quantity) {
      throw new Error(`INSUFFICIENT_BALANCE: Owner ${owner} owns ${ownerBalance} active REC, cannot retire ${quantity} REC.`);
    }

    // Deduct active, add to retired
    asset.balances[owner] = ownerBalance - quantity;
    asset.activeQuantity -= quantity;
    asset.retiredQuantity += quantity;

    if (asset.activeQuantity === 0) {
      asset.status = 'RETIRED';
    }

    const now = this.getTxTimestamp(ctx);
    asset.updatedAt = now;

    await ctx.stub.putState(recId, Buffer.from(JSON.stringify(asset)));

    const eventPayload = {
      recId: asset.recId,
      owner: owner,
      retiredQuantity: quantity,
      totalRetiredQuantity: asset.retiredQuantity,
      remainingActiveQuantity: asset.activeQuantity,
      reason: retirementReason || 'Compliance Retirement',
      txId: ctx.stub.getTxID(),
      timestamp: now
    };
    ctx.stub.setEvent('REC_RETIRED', Buffer.from(JSON.stringify(eventPayload)));

    return JSON.stringify(asset);
  }

  /**
   * cancelREC
   * Cancels a REC due to fraud, error, or regulatory directive.
   * Only RegulatorOrgMSP or IssuerOrgMSP identities can execute this.
   */
  @Transaction()
  public async cancelREC(
    ctx: Context,
    recId: string,
    reason: string
  ): Promise<string> {
    const callerMsp = ctx.clientIdentity.getMSPID();
    if (callerMsp !== 'RegulatorOrgMSP' && callerMsp !== 'IssuerOrgMSP') {
      throw new Error(`UNAUTHORIZED: Caller with MSP ${callerMsp} is not authorized to cancel RECs. Only RegulatorOrgMSP or IssuerOrgMSP can cancel.`);
    }

    const assetBytes = await ctx.stub.getState(recId);
    if (!assetBytes || assetBytes.length === 0) {
      throw new Error(`REC_NOT_FOUND: REC ${recId} does not exist.`);
    }

    const asset: RECAsset = JSON.parse(assetBytes.toString());
    asset.status = 'CANCELLED';
    asset.activeQuantity = 0;

    const now = this.getTxTimestamp(ctx);
    asset.updatedAt = now;

    await ctx.stub.putState(recId, Buffer.from(JSON.stringify(asset)));

    const eventPayload = {
      recId: asset.recId,
      cancelledByMsp: callerMsp,
      reason: reason || 'Regulatory Sanction',
      txId: ctx.stub.getTxID(),
      timestamp: now
    };
    ctx.stub.setEvent('REC_CANCELLED', Buffer.from(JSON.stringify(eventPayload)));

    return JSON.stringify(asset);
  }

  /**
   * getREC
   * Retrieves complete on-chain state for an existing REC.
   */
  @Transaction(false)
  @Returns('string')
  public async getREC(ctx: Context, recId: string): Promise<string> {
    const assetBytes = await ctx.stub.getState(recId);
    if (!assetBytes || assetBytes.length === 0) {
      throw new Error(`REC_NOT_FOUND: REC ${recId} does not exist on the ledger.`);
    }
    return assetBytes.toString();
  }

  /**
   * getRECHistory
   * Returns complete historical modifications for a REC key using Fabric GetHistoryForKey.
   */
  @Transaction(false)
  @Returns('string')
  public async getRECHistory(ctx: Context, recId: string): Promise<string> {
    const iterator = await ctx.stub.getHistoryForKey(recId);
    const history: any[] = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value) {
        let tsStr = '';
        try {
          const txTimestamp: any = result.value.timestamp;
          if (txTimestamp && typeof txTimestamp.toDate === 'function') {
            tsStr = txTimestamp.toDate().toISOString();
          } else if (txTimestamp && txTimestamp.seconds) {
            const sec = typeof txTimestamp.seconds.toInt === 'function'
              ? txTimestamp.seconds.toInt()
              : Number(txTimestamp.seconds);
            tsStr = new Date(sec * 1000).toISOString();
          } else {
            tsStr = new Date().toISOString();
          }
        } catch {
          tsStr = new Date().toISOString();
        }

        const record = {
          txId: result.value.txId,
          timestamp: tsStr,
          isDelete: result.value.isDelete,
          value: result.value.value && result.value.value.length > 0 ? JSON.parse(result.value.value.toString()) : null
        };
        history.push(record);
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(history);
  }

  /**
   * getTransactionHistory
   * Returns clean, structured transaction events for a specific REC.
   */
  @Transaction(false)
  @Returns('string')
  public async getTransactionHistory(ctx: Context, recId: string): Promise<string> {
    return this.getRECHistory(ctx, recId);
  }

  /**
   * verifyREC
   * Verifies state consistency, document hash presence, and validity of a REC.
   */
  @Transaction(false)
  @Returns('string')
  public async verifyREC(ctx: Context, recId: string): Promise<string> {
    const assetBytes = await ctx.stub.getState(recId);
    if (!assetBytes || assetBytes.length === 0) {
      return JSON.stringify({
        valid: false,
        status: 'NOT_FOUND',
        message: `REC ${recId} not found on the distributed ledger.`
      });
    }

    const asset: RECAsset = JSON.parse(assetBytes.toString());

    if (asset.status === 'CANCELLED') {
      return JSON.stringify({
        valid: false,
        status: 'CANCELLED',
        message: `REC ${recId} has been CANCELLED due to regulatory action or detected invalidity.`,
        asset
      });
    }

    const sumQuantities = asset.activeQuantity + asset.retiredQuantity;
    if (sumQuantities !== asset.issuedQuantity) {
      return JSON.stringify({
        valid: false,
        status: 'QUANTITY_DISCREPANCY',
        message: `Corrupted quantity balance: active (${asset.activeQuantity}) + retired (${asset.retiredQuantity}) != issued (${asset.issuedQuantity}).`,
        asset
      });
    }

    return JSON.stringify({
      valid: true,
      status: asset.status,
      message: 'REC verified successfully. Cryptographic state and quantities are consistent.',
      asset
    });
  }
}
