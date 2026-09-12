import { Object, Property } from 'fabric-contract-api';

@Object()
export class RECAsset {
  @Property()
  public recId: string = '';

  @Property()
  public generatorId: string = '';

  @Property()
  public energySource: string = ''; // SOLAR, WIND, HYDRO, BIOMASS

  @Property()
  public generationDate: string = ''; // YYYY-MM-DD

  @Property()
  public generationMWh: number = 0;

  @Property()
  public issuedQuantity: number = 0;

  @Property()
  public currentOwner: string = '';

  @Property()
  public activeQuantity: number = 0;

  @Property()
  public retiredQuantity: number = 0;

  @Property()
  public status: 'ACTIVE' | 'RETIRED' | 'CANCELLED' = 'ACTIVE';

  @Property()
  public documentHash: string = '';

  @Property()
  public createdAt: string = '';

  @Property()
  public updatedAt: string = '';

  @Property()
  public balances: { [owner: string]: number } = {};
}

@Object()
export class RECTransactionRecord {
  @Property()
  public txId: string = '';

  @Property()
  public recId: string = '';

  @Property()
  public txType: string = ''; // REC_CREATED | REC_TRANSFERRED | REC_RETIRED | REC_CANCELLED

  @Property()
  public timestamp: string = '';

  @Property()
  public mspId: string = '';

  @Property()
  public caller: string = '';

  @Property()
  public fromOwner?: string;

  @Property()
  public toOwner?: string;

  @Property()
  public quantity?: number;

  @Property()
  public documentHash?: string;

  @Property()
  public reference?: string;

  @Property()
  public reason?: string;
}
