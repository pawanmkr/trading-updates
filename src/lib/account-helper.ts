import { Parser } from "xml2js";

export interface Account {
    accountId: string;
    accountIdKey: string;
    accountMode: string;
    accountDesc: string;
    accountName: string;
    accountType: string;
    institutionType: string;
    accountStatus: string;
    closedDate: string;
    shareWorksAccount: boolean;
    fcManagedMssbClosedAccount: boolean;
}


export function parseEtradeXmlAccountList(xmlData: string): Promise<Account[]> {
    const parser = new Parser();
    return new Promise((resolve, reject) => {
        parser.parseString(xmlData, (err, result) => {
            if (err) {
                reject(err);
            } else {
                const accountsRaw = result.AccountListResponse?.Accounts?.[0]?.Account;
                if (!accountsRaw || !Array.isArray(accountsRaw)) {
                    throw new Error("Invalid or missing account data");
                }

                const accounts = accountsRaw.map((account) => ({
                    accountId: account.accountId[0],
                    accountIdKey: account.accountIdKey[0],
                    accountMode: account.accountMode[0],
                    accountDesc: account.accountDesc[0],
                    accountName: account.accountName[0],
                    accountType: account.accountType[0],
                    institutionType: account.institutionType[0],
                    accountStatus: account.accountStatus[0],
                    closedDate: account.closedDate[0],
                    shareWorksAccount: account.shareWorksAccount[0] === 'true',
                    fcManagedMssbClosedAccount: account.fcManagedMssbClosedAccount[0] === 'true',
                }));

                resolve(accounts);
            }
        });
    });
}


export interface BalanceResponse {
    accountId: string;
    accountType: string;
    optionLevel: string;
    accountDescription: string;
    quoteMode: string;
    dayTraderStatus: string;
    accountMode: string;
    Cash: {
        fundsForOpenOrdersCash: string;
        moneyMktBalance: string;
    };
    Computed: {
        cashAvailableForInvestment: string;
        netCash: string;
        cashBalance: string;
        settledCashForInvestment: string;
        unSettledCashForInvestment: string;
        fundsWithheldFromPurchasePower: string;
        fundsWithheldFromWithdrawal: string;
        marginBuyingPower: string;
        cashBuyingPower: string;
        dtMarginBuyingPower: string;
        dtCashBuyingPower: string;
        shortAdjustBalance: string;
        regtEquity: string;
        regtEquityPercent: string;
        accountBalance: string;
    };
}

export async function parseBalanceResponseXmlToJson(xmlData: string): Promise<BalanceResponse> {
    const parser = new Parser();
    return new Promise((resolve, reject) => {
        parser.parseString(xmlData, (err, result) => {
            if (err) {
                reject(err);
            } else {
                const balanceResponse: BalanceResponse = {
                    accountId: result.BalanceResponse.accountId[0],
                    accountType: result.BalanceResponse.accountType[0],
                    optionLevel: result.BalanceResponse.optionLevel[0],
                    accountDescription: result.BalanceResponse.accountDescription[0],
                    quoteMode: result.BalanceResponse.quoteMode[0],
                    dayTraderStatus: result.BalanceResponse.dayTraderStatus[0],
                    accountMode: result.BalanceResponse.accountMode[0],
                    Cash: {
                        fundsForOpenOrdersCash: result.BalanceResponse.Cash[0].fundsForOpenOrdersCash[0],
                        moneyMktBalance: result.BalanceResponse.Cash[0].moneyMktBalance[0],
                    },
                    Computed: {
                        cashAvailableForInvestment: result.BalanceResponse.Computed[0].cashAvailableForInvestment[0],
                        netCash: result.BalanceResponse.Computed[0].netCash[0],
                        cashBalance: result.BalanceResponse.Computed[0].cashBalance[0],
                        settledCashForInvestment: result.BalanceResponse.Computed[0].settledCashForInvestment[0],
                        unSettledCashForInvestment: result.BalanceResponse.Computed[0].unSettledCashForInvestment[0],
                        fundsWithheldFromPurchasePower: result.BalanceResponse.Computed[0].fundsWithheldFromPurchasePower[0],
                        fundsWithheldFromWithdrawal: result.BalanceResponse.Computed[0].fundsWithheldFromWithdrawal[0],
                        marginBuyingPower: result.BalanceResponse.Computed[0].marginBuyingPower[0],
                        cashBuyingPower: result.BalanceResponse.Computed[0].cashBuyingPower[0],
                        dtMarginBuyingPower: result.BalanceResponse.Computed[0].dtMarginBuyingPower[0],
                        dtCashBuyingPower: result.BalanceResponse.Computed[0].dtCashBuyingPower[0],
                        shortAdjustBalance: result.BalanceResponse.Computed[0].shortAdjustBalance[0],
                        regtEquity: result.BalanceResponse.Computed[0].regtEquity[0],
                        regtEquityPercent: result.BalanceResponse.Computed[0].regtEquityPercent[0],
                        accountBalance: result.BalanceResponse.Computed[0].accountBalance[0],
                    },
                };
                resolve(balanceResponse);
            }
        });
    });
}



interface Product {
    symbol: string;
    securityType: string;
    callPut?: string;
    expiryYear?: string;
    expiryMonth?: string;
    expiryDay?: string;
    strikePrice?: string;
    productId?: {
        symbol: string;
        typeCode: string;
    }[];
}

interface Quick {
    change: string;
    changePct: string;
    lastTrade: string;
    lastTradeTime: string;
    quoteStatus: string;
    volume: string;
}

interface Position {
    positionId: string;
    Product: Product;
    symbolDescription: string;
    dateAcquired: string;
    pricePaid: string;
    commissions: string;
    otherFees: string;
    quantity: string;
    positionIndicator: string;
    positionType: string;
    daysGain: string;
    daysGainPct: string;
    marketValue: string;
    totalCost: string;
    totalGain: string;
    totalGainPct: string;
    pctOfPortfolio: string;
    costPerShare: string;
    todayCommissions: string;
    todayFees: string;
    todayPricePaid: string;
    todayQuantity: string;
    adjPrevClose: string;
    Quick: Quick;
    lotsDetails: string;
    quoteDetails: string;
}

interface AccountPortfolio {
    accountId: string;
    Position: Position[];
    totalPages: string;
}

export interface PortfolioResponse {
    PortfolioResponse: AccountPortfolio;
}

export function parsePortfolioResponseXmlToJson(xmlData: string): Promise<PortfolioResponse> {
    const parser = new Parser();
    return new Promise((resolve, reject) => {
        parser.parseString(xmlData, (err, result) => {
            if (err) {
                reject(err);
            } else {
                try {
                    const portfolioResponse: PortfolioResponse = {
                        PortfolioResponse: {
                            accountId: result.PortfolioResponse.AccountPortfolio[0].accountId[0],
                            Position: result.PortfolioResponse.AccountPortfolio[0].Position.map((position) => ({
                                positionId: position.positionId[0],
                                Product: position.Product?.map((product) => ({
                                    expiryDay: product.expiryDay?.[0],
                                    expiryMonth: product.expiryMonth?.[0],
                                    expiryYear: product.expiryYear?.[0],
                                    productId: {
                                        symbol: product.productId?.[0]?.symbol?.[0],
                                        typeCode: product.productId?.[0]?.typeCode?.[0],
                                    },
                                    securitySubType: product.securitySubType?.[0],
                                    securityType: product.securityType?.[0],
                                    strikePrice: product.strikePrice?.[0],
                                    symbol: product.symbol?.[0],
                                }))?.[0],
                                symbolDescription: position.symbolDescription[0],
                                dateAcquired: position.dateAcquired[0],
                                pricePaid: position.pricePaid[0],
                                commissions: position.commissions[0],
                                otherFees: position.otherFees[0],
                                quantity: position.quantity[0],
                                positionIndicator: position.positionIndicator[0],
                                positionType: position.positionType[0],
                                daysGain: position.daysGain[0],
                                daysGainPct: position.daysGainPct[0],
                                marketValue: position.marketValue[0],
                                totalCost: position.totalCost[0],
                                totalGain: position.totalGain[0],
                                totalGainPct: position.totalGainPct[0],
                                pctOfPortfolio: position.pctOfPortfolio[0],
                                costPerShare: position.costPerShare[0],
                                todayCommissions: position.todayCommissions[0],
                                todayFees: position.todayFees[0],
                                todayPricePaid: position.todayPricePaid[0],
                                todayQuantity: position.todayQuantity[0],
                                adjPrevClose: position.adjPrevClose[0],
                                Quick: {
                                    change: position.Quick?.[0]?.change?.[0],
                                    changePct: position.Quick?.[0]?.changePct?.[0],
                                    lastTrade: position.Quick?.[0]?.lastTrade?.[0],
                                    lastTradeTime: position.Quick?.[0]?.lastTradeTime?.[0],
                                    quoteStatus: position.Quick?.[0]?.quoteStatus?.[0],
                                    volume: position.Quick?.[0]?.volume?.[0],
                                },
                                lotsDetails: position.lotsDetails[0],
                                quoteDetails: position.quoteDetails[0],
                            })),
                            totalPages: result.PortfolioResponse.AccountPortfolio[0].totalPages[0]
                        }
                    };
                    resolve(portfolioResponse);
                } catch (parseError) {
                    console.log(result);
                    console.error("\nError parsing protfolio", parseError);
                    reject(parseError);
                }
            }
        });
    });
}


interface Instrument {
    Product: Product[];
    symbolDescription: string;
    orderAction: string;
    quantityType: string;
    orderedQuantity: string;
    filledQuantity: string;
    estimatedCommission: string;
    estimatedFees: string;
}

interface OrderDetail {
    placedTime: string;
    executedTime: string;
    orderValue: string;
    status: string;
    orderTerm: string;
    priceType: string;
    limitPrice: string;
    stopPrice: string;
    marketSession: string;
    allOrNone: string;
    Instrument: Instrument[];
    netPrice: string;
    netBid: string;
    netAsk: string;
    gcd: string;
    ratio: string;
}

export interface Order {
    orderId: string;
    details: string;
    orderType: string;
    OrderDetail: OrderDetail[];
}

interface OrdersResponse {
    OrdersResponse: {
        Order: Order[];
    };
}

export async function parseOrdersResponseXmlToJson(xmlData: string): Promise<Order> {
    const parser = new Parser();
    return new Promise((resolve, reject) => {
        parser.parseString(xmlData, (err, result) => {
            if (err) {
                reject(err);
            } else {
                const orders = result.OrdersResponse.Order.map((order: any) => {
                    return {
                        orderId: order.orderId[0],
                        details: order.details[0],
                        orderType: order.orderType[0],
                        OrderDetail: order.OrderDetail.map((detail: any) => {
                            return {
                                placedTime: detail.placedTime[0],
                                executedTime: detail.executedTime[0],
                                orderValue: detail.orderValue[0],
                                status: detail.status[0],
                                orderTerm: detail.orderTerm[0],
                                priceType: detail.priceType[0],
                                limitPrice: detail.limitPrice[0],
                                stopPrice: detail.stopPrice[0],
                                marketSession: detail.marketSession[0],
                                allOrNone: detail.allOrNone[0],
                                Instrument: detail.Instrument.map((instrument: any) => {
                                    return {
                                        Product: instrument.Product.map((product: any) => {
                                            return {
                                                symbol: product.symbol[0],
                                                securityType: product.securityType[0],
                                                callPut: product.callPut ? product.callPut[0] : undefined,
                                                expiryYear: product.expiryYear ? product.expiryYear[0] : undefined,
                                                expiryMonth: product.expiryMonth ? product.expiryMonth[0] : undefined,
                                                expiryDay: product.expiryDay ? product.expiryDay[0] : undefined,
                                                strikePrice: product.strikePrice ? product.strikePrice[0] : undefined,
                                                productId: product.productId ? product.productId.map((id: any) => {
                                                    return {
                                                        symbol: id.symbol[0],
                                                        typeCode: id.typeCode[0]
                                                    };
                                                }) : undefined
                                            };
                                        }),
                                        symbolDescription: instrument.symbolDescription[0],
                                        orderAction: instrument.orderAction[0],
                                        quantityType: instrument.quantityType[0],
                                        orderedQuantity: instrument.orderedQuantity[0],
                                        filledQuantity: instrument.filledQuantity[0],
                                        estimatedCommission: instrument.estimatedCommission[0],
                                        estimatedFees: instrument.estimatedFees[0]
                                    };
                                }),
                                netPrice: detail.netPrice[0],
                                netBid: detail.netBid[0],
                                netAsk: detail.netAsk[0],
                                gcd: detail.gcd[0],
                                ratio: detail.ratio[0]
                            };
                        })
                    };
                });
                resolve(orders);
            }
        });
    });
}
