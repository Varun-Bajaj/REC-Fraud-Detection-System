import { expect } from 'chai';
import { RECContract } from '../src/recContract';
import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';

describe('RECContract Unit Tests', () => {
  let contract: RECContract;
  let ctx: any;
  let mockStub: any;
  let mockClientIdentity: any;
  let stateMap: Map<string, Buffer>;
  let eventsMap: Map<string, Buffer>;

  beforeEach(() => {
    contract = new RECContract();
    stateMap = new Map<string, Buffer>();
    eventsMap = new Map<string, Buffer>();

    mockStub = {
      getState: async (key: string) => stateMap.get(key) || Buffer.alloc(0),
      putState: async (key: string, value: Buffer) => { stateMap.set(key, value); },
      setEvent: (name: string, payload: Buffer) => { eventsMap.set(name, payload); },
      getTxID: () => 'mock-tx-001',
      getTxTimestamp: () => ({ seconds: { low: 1773340000, high: 0 }, nanos: 0 }),
      getHistoryForKey: async (key: string) => {
        const historyList = [
          {
            txId: 'mock-tx-001',
            timestamp: { seconds: { low: 1773340000, high: 0 }, nanos: 0 },
            isDelete: false,
            value: stateMap.get(key) || Buffer.alloc(0)
          }
        ];
        let index = 0;
        return {
          next: async () => {
            if (index < historyList.length) {
              return { value: historyList[index++], done: false };
            }
            return { value: null, done: true };
          },
          close: async () => {}
        };
      }
    };

    mockClientIdentity = {
      mspId: 'IssuerOrgMSP',
      getMSPID: function() { return this.mspId; }
    };

    ctx = {
      stub: mockStub,
      clientIdentity: mockClientIdentity
    };
  });

  const validHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  describe('createREC', () => {
    it('should successfully create a REC when called by IssuerOrgMSP', async () => {
      const resStr = await contract.createREC(
        ctx,
        'REC-000001',
        'GEN-001',
        'SOLAR',
        '2026-09-10',
        '100.0',
        '100',
        validHash
      );
      const res = JSON.parse(resStr);
      expect(res.recId).to.equal('REC-000001');
      expect(res.status).to.equal('ACTIVE');
      expect(res.activeQuantity).to.equal(100);
      expect(res.retiredQuantity).to.equal(0);
      expect(res.documentHash).to.equal(validHash);
      expect(eventsMap.has('REC_CREATED')).to.be.true;
    });

    it('should reject creation when caller is BuyerOrgMSP', async () => {
      mockClientIdentity.mspId = 'BuyerOrgMSP';
      try {
        await contract.createREC(
          ctx,
          'REC-000001',
          'GEN-001',
          'SOLAR',
          '2026-09-10',
          '100.0',
          '100',
          validHash
        );
        expect.fail('Should have thrown UNAUTHORIZED');
      } catch (err: any) {
        expect(err.message).to.include('UNAUTHORIZED');
      }
    });

    it('should reject creation when duplicate REC ID exists', async () => {
      await contract.createREC(ctx, 'REC-000001', 'GEN-001', 'SOLAR', '2026-09-10', '100.0', '100', validHash);
      try {
        await contract.createREC(ctx, 'REC-000001', 'GEN-001', 'SOLAR', '2026-09-10', '100.0', '100', validHash);
        expect.fail('Should have thrown DUPLICATE_REC_ID');
      } catch (err: any) {
        expect(err.message).to.include('DUPLICATE_REC_ID');
      }
    });

    it('should reject creation with zero or negative quantity', async () => {
      try {
        await contract.createREC(ctx, 'REC-000001', 'GEN-001', 'SOLAR', '2026-09-10', '100.0', '0', validHash);
        expect.fail('Should have thrown INVALID_QUANTITY');
      } catch (err: any) {
        expect(err.message).to.include('INVALID_QUANTITY');
      }
    });

    it('should reject creation with invalid document hash format', async () => {
      try {
        await contract.createREC(ctx, 'REC-000001', 'GEN-001', 'SOLAR', '2026-09-10', '100.0', '100', 'not-a-hash');
        expect.fail('Should have thrown INVALID_DOCUMENT_HASH');
      } catch (err: any) {
        expect(err.message).to.include('INVALID_DOCUMENT_HASH');
      }
    });
  });

  describe('transferREC', () => {
    beforeEach(async () => {
      await contract.createREC(ctx, 'REC-000001', 'GEN-001', 'SOLAR', '2026-09-10', '100.0', '100', validHash);
    });

    it('should successfully transfer partial quantity and update balances', async () => {
      const resStr = await contract.transferREC(ctx, 'REC-000001', 'ISSUER-ORG', 'BUYER-A', '40', 'TX-REF-001');
      const res = JSON.parse(resStr);
      expect(res.balances['ISSUER-ORG']).to.equal(60);
      expect(res.balances['BUYER-A']).to.equal(40);
      expect(res.activeQuantity).to.equal(100);
      expect(res.currentOwner).to.equal('BUYER-A');
      expect(eventsMap.has('REC_TRANSFERRED')).to.be.true;
    });

    it('should reject transfer when sender has insufficient balance', async () => {
      try {
        await contract.transferREC(ctx, 'REC-000001', 'ISSUER-ORG', 'BUYER-A', '150', 'TX-REF-002');
        expect.fail('Should have thrown INSUFFICIENT_BALANCE');
      } catch (err: any) {
        expect(err.message).to.include('INSUFFICIENT_BALANCE');
      }
    });

    it('should reject transfer when caller is AuditorOrgMSP', async () => {
      mockClientIdentity.mspId = 'AuditorOrgMSP';
      try {
        await contract.transferREC(ctx, 'REC-000001', 'ISSUER-ORG', 'BUYER-A', '20', 'TX-REF-003');
        expect.fail('Should have thrown UNAUTHORIZED');
      } catch (err: any) {
        expect(err.message).to.include('UNAUTHORIZED');
      }
    });
  });

  describe('retireREC', () => {
    beforeEach(async () => {
      await contract.createREC(ctx, 'REC-000001', 'GEN-001', 'SOLAR', '2026-09-10', '100.0', '100', validHash);
      await contract.transferREC(ctx, 'REC-000001', 'ISSUER-ORG', 'BUYER-A', '40', 'TX-REF-001');
    });

    it('should successfully retire active quantity and increment retiredQuantity', async () => {
      mockClientIdentity.mspId = 'BuyerOrgMSP';
      const resStr = await contract.retireREC(ctx, 'REC-000001', 'BUYER-A', '20', 'Scope 2 Compliance');
      const res = JSON.parse(resStr);
      expect(res.balances['BUYER-A']).to.equal(20);
      expect(res.retiredQuantity).to.equal(20);
      expect(res.activeQuantity).to.equal(80);
      expect(res.status).to.equal('ACTIVE');
      expect(eventsMap.has('REC_RETIRED')).to.be.true;
    });

    it('should mark status as RETIRED when all active quantity is retired', async () => {
      await contract.retireREC(ctx, 'REC-000001', 'ISSUER-ORG', '60', 'Corporate Net-Zero');
      await contract.retireREC(ctx, 'REC-000001', 'BUYER-A', '40', 'Corporate Net-Zero');
      const resStr = await contract.getREC(ctx, 'REC-000001');
      const res = JSON.parse(resStr);
      expect(res.status).to.equal('RETIRED');
      expect(res.activeQuantity).to.equal(0);
      expect(res.retiredQuantity).to.equal(100);
    });

    it('should reject retirement exceeding owned balance', async () => {
      try {
        await contract.retireREC(ctx, 'REC-000001', 'BUYER-A', '50', 'Excess retirement');
        expect.fail('Should have thrown INSUFFICIENT_BALANCE');
      } catch (err: any) {
        expect(err.message).to.include('INSUFFICIENT_BALANCE');
      }
    });
  });

  describe('cancelREC', () => {
    beforeEach(async () => {
      await contract.createREC(ctx, 'REC-000001', 'GEN-001', 'SOLAR', '2026-09-10', '100.0', '100', validHash);
    });

    it('should allow RegulatorOrgMSP to cancel a REC', async () => {
      mockClientIdentity.mspId = 'RegulatorOrgMSP';
      const resStr = await contract.cancelREC(ctx, 'REC-000001', 'Detected double counting fraud');
      const res = JSON.parse(resStr);
      expect(res.status).to.equal('CANCELLED');
      expect(res.activeQuantity).to.equal(0);
      expect(eventsMap.has('REC_CANCELLED')).to.be.true;
    });

    it('should reject cancellation by BuyerOrgMSP', async () => {
      mockClientIdentity.mspId = 'BuyerOrgMSP';
      try {
        await contract.cancelREC(ctx, 'REC-000001', 'Unauthorized cancellation attempt');
        expect.fail('Should have thrown UNAUTHORIZED');
      } catch (err: any) {
        expect(err.message).to.include('UNAUTHORIZED');
      }
    });

    it('should prevent transfer or retirement on CANCELLED REC', async () => {
      mockClientIdentity.mspId = 'RegulatorOrgMSP';
      await contract.cancelREC(ctx, 'REC-000001', 'Fraud sanction');

      try {
        await contract.transferREC(ctx, 'REC-000001', 'ISSUER-ORG', 'BUYER-A', '10', 'ref');
        expect.fail('Should have thrown INVALID_STATE');
      } catch (err: any) {
        expect(err.message).to.include('CANCELLED');
      }
    });
  });

  describe('verifyREC', () => {
    it('should verify a clean active REC', async () => {
      await contract.createREC(ctx, 'REC-000001', 'GEN-001', 'SOLAR', '2026-09-10', '100.0', '100', validHash);
      const resStr = await contract.verifyREC(ctx, 'REC-000001');
      const res = JSON.parse(resStr);
      expect(res.valid).to.be.true;
      expect(res.status).to.equal('ACTIVE');
    });

    it('should return valid=false for non-existent REC', async () => {
      const resStr = await contract.verifyREC(ctx, 'NON-EXISTENT');
      const res = JSON.parse(resStr);
      expect(res.valid).to.be.false;
      expect(res.status).to.equal('NOT_FOUND');
    });
  });
});
