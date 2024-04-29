import { EtradeAccount } from "./accounts";

export interface Portfolio {
    day: string;
    date: string;
    totalAccounts: number;
    retirementAccounts: number;
    retirementAccountsValue: number;
    nonRetirementAccounts: number;
    nonRetirementAccountsValue: number;
    investedAmount: number;
    cashReserveAmount: Map<string, number>;
    todaysUpdate: TodaysUpdate;
    stockEtfsMfsBonds: StockEtfsMfsBonds;
    dividends: {
        annual: number;
        monthly: number;
    };
    trades: {
        annual: {
            total: number;
            buy: {
                count: number,
                amount: number;
            };
            sell: {
                count: number,
                amount: number;
            };
            options: {
                total: number;
                buy: {
                    count: number,
                    amount: number;
                };
                sell: {
                    count: number,
                    amount: number;
                };
            };
            eqBondsEtfsMfs: {
                total: number;
                buy: {
                    count: number,
                    amount: number;
                };
                sell: {
                    count: number,
                    amount: number;
                };
            };
        };
        monthly: {
            total: number;
            buy: {
                count: number,
                amount: number;
            };
            sell: {
                count: number,
                amount: number;
            };
            options: {
                total: number;
                buy: {
                    count: number,
                    amount: number;
                };
                sell: {
                    count: number,
                    amount: number;
                };
            };
            eqBondsEtfsMfs: {
                total: number;
                buy: {
                    count: number,
                    amount: number;
                };
                sell: {
                    count: number,
                    amount: number;
                };
            };
        };
    };
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
    change: number;
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
    retirementAccountsValue: 0,
    nonRetirementAccounts: 0,
    nonRetirementAccountsValue: 0,
    investedAmount: 0,
    cashReserveAmount: new Map<string, number>(),
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
        change: 0,
        top3: [],
        bottom3: [],
    },
    trades: {
        annual: {
            total: 0,
            buy: {
                count: 0,
                amount: 0,
            },
            sell: {
                count: 0,
                amount: 0,
            },
            options: {
                total: 0,
                buy: {
                    count: 0,
                    amount: 0,
                },
                sell: {
                    count: 0,
                    amount: 0,
                },
            },
            eqBondsEtfsMfs: {
                total: 0,
                buy: {
                    count: 0,
                    amount: 0,
                },
                sell: {
                    count: 0,
                    amount: 0,
                },
            },
        },
        monthly: {
            total: 0,
            buy: {
                count: 0,
                amount: 0,
            },
            sell: {
                count: 0,
                amount: 0,
            },
            options: {
                total: 0,
                buy: {
                    count: 0,
                    amount: 0,
                },
                sell: {
                    count: 0,
                    amount: 0,
                },
            },
            eqBondsEtfsMfs: {
                total: 0,
                buy: {
                    count: 0,
                    amount: 0,
                },
                sell: {
                    count: 0,
                    amount: 0,
                },
            },
        },
    },
    dividends: {
        annual: 0,
        monthly: 0
    },
};

export default pf;