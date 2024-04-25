export interface Portfolio {
  day: string;
  date: string;
  totalAccounts: number;
  retirementAccounts: number;
  nonRetirementAccounts: number;
  investedAmount: number;
  cashReserveAmount: number;
  todaysUpdate: TodaysUpdate;
  stockEtfsMfsBonds: StockEtfsMfsBonds;
  dividends: Dividends; // Added dividends field
}

interface Dividends {
  annualDividend: number;
  dividend: number;
  divYield: number;
  divPayDate: string;
  exDividendDate: string;
  cusip: string;
}
interface TodaysUpdate {
  daysGain: number;
  top3Gainers: string[];
  top3Losers: string[];
  anualGain: AnualGain;
  orders: Orders;
}

interface AnualGain {
  amount: number;
  shortTerm: number;
  longTerm: number;
}

interface Orders {
  total: number;
  filled: number;
  cancelled: number;
  expired: number;
}

interface StockEtfsMfsBonds {
  changes: string;
  top3: Holding[];
  bottom3: Holding[];
}

interface Holding {
  name: string;
  change: string;
}

const pf: Portfolio = {
  day: "",
  date: "",
  totalAccounts: 0,
  retirementAccounts: 0,
  nonRetirementAccounts: 0,
  investedAmount: 0,
  cashReserveAmount: 0,
  todaysUpdate: {
    daysGain: 0,
    top3Gainers: [],
    top3Losers: [],
    anualGain: {
      amount: 0,
      shortTerm: 0,
      longTerm: 0,
    },
    orders: {
      total: 0,
      filled: 0,
      cancelled: 0,
      expired: 0,
    },
  },
  stockEtfsMfsBonds: {
    changes: "",
    top3: [],
    bottom3: [],
  },

  dividends: {
    annualDividend: 0,
    dividend: 0,
    divYield: 0,
    divPayDate: "",
    exDividendDate: "",
    cusip: "",
  },
};

export default pf;
