const RealDate = globalThis.Date;
const InitialNow = 1587559258;

export let now = InitialNow;

export class MockDate extends RealDate {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super(now * 1000);
    } else {
      super(...(args as [any]));
    }
  }

  public static now() {
    return now * 1000;
  }

  public static parse = RealDate.parse;
  public static UTC = RealDate.UTC;

  public getFullYear() {
    return this.getUTCFullYear();
  }

  public getMonth() {
    return this.getUTCMonth();
  }

  public getDate() {
    return this.getUTCDate();
  }

  public getHours() {
    return this.getUTCHours();
  }

  public getMinutes() {
    return this.getUTCMinutes();
  }

  public getSeconds() {
    return this.getUTCSeconds();
  }

  public getMilliseconds() {
    return this.getUTCMilliseconds();
  }
}

beforeEach(() => {
  now = InitialNow;
  globalThis.Date = MockDate as unknown as DateConstructor;
});

afterEach(() => {
  globalThis.Date = RealDate;
});

export function setCurrentTime(newNow: number) {
  now = newNow;
}
