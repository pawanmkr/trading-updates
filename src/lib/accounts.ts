import { configDotenv } from "dotenv";
import * as oauth from "oauth";
import util from "node:util";
import dayjs from "dayjs";
import { format } from "date-fns";
import {
    Account,
    BalanceResponse,
    Order,
    parseBalanceResponseXmlToJson,
    parseEtradeXmlAccountList,
    parseOrdersResponseXmlToJson,
    parsePortfolioResponseXmlToJson,
    parseTransactionsResponseXmlToJson,
    PortfolioResponse,
    Transaction,
} from "./account-helper.js";
import pf from "./portfolio.js";
// import prepareMessage from "../utils/message.js";
import tts from "../services/tts.js";
import { sendEmail } from "../services/mail.js";
import { Parser } from "xml2js";

configDotenv();

// prod keys
const consumerKey = "c1d9bf52628e0a68e317d82bcfcc615c";
const consumerSecret =
    "86436f4a2c2ab89d4c67e53734244b7f788470823405dd7337698fad66ee5423";

const oauthClient = new oauth.OAuth(
    "https://api.etrade.com/oauth/request_token",
    "https://api.etrade.com/oauth/access_token",
    consumerKey,
    consumerSecret,
    "1.0",
    "oob", // Out-of-band for manual code grant
    "HMAC-SHA1"
);

interface Holdings {
    symbol: string;
    daysGain: number;
}

export class EtradeAccount {
    private accessToken: string;
    private accessTokenSecret: string;
    holdings: Holdings[] = [];

    constructor(accessToken: string, accessTokenSecret: string) {
        this.accessToken = accessToken;
        this.accessTokenSecret = accessTokenSecret;
    }

    async listAccounts(): Promise<Account[]> {
        return new Promise((resolve, reject) => {
            oauthClient.get(
                "https://api.etrade.com/v1/accounts/list",
                this.accessToken,
                this.accessTokenSecret,
                async (err, result, response) => {
                    if (err) {
                        console.log("\nFailed to list accounts");
                        console.error(err);
                        reject(err);
                    } else {
                        try {
                            const accounts = await parseEtradeXmlAccountList(
                                result as string
                            );
                            const activeAccounts = accounts.filter(
                                (ac) => ac.accountStatus === "ACTIVE"
                            );
                            resolve(activeAccounts);
                        } catch (parseError) {
                            console.error("\nError parsing account list", parseError);
                            reject(parseError);
                        }
                    }
                }
            );
        });
    }

    async getAccountBalances(
        accountIdKey: string,
        institutionType: string
    ): Promise<BalanceResponse> {
        return new Promise((resolve, reject) => {
            oauthClient.get(
                `https://api.etrade.com/v1/accounts/${accountIdKey}/balance?instType=${institutionType}&realTimeNAV=true`,
                this.accessToken,
                this.accessTokenSecret,
                async (err, result, response) => {
                    if (err) {
                        console.log("\nFailed to get account balances");
                        console.error(err);
                        reject(err);
                    } else {
                        try {
                            const balances = await parseBalanceResponseXmlToJson(
                                result as string
                            );
                            resolve(balances);
                        } catch (parseError) {
                            console.error("\nError parsing account balances", parseError);
                            reject(parseError);
                        }
                    }
                }
            );
        });
    }

    async listOrders(accountIdKey: string): Promise<Order | null> {
        return new Promise((resolve, reject) => {
            oauthClient.get(
                `https://api.etrade.com/v1/accounts/${accountIdKey}/orders?fromDate=${dayjs()
                    .subtract(1, "day")
                    .format("MMDDYYYY")}&toDate=${dayjs().format("MMDDYYYY")}`,
                this.accessToken,
                this.accessTokenSecret,
                async (err, result, response) => {
                    if (err) {
                        console.log("\nFailed to get orders list");
                        console.error(err);
                        reject(err);
                    } else {
                        try {
                            if (!result) {
                                console.log(`\nNo orders found for ${accountIdKey}`);
                                resolve(null);
                            } else {
                                const orders: Order = await parseOrdersResponseXmlToJson(result as string);
                                resolve(orders);
                            }
                        } catch (parseError) {
                            console.error("\nError parsing order list", parseError);
                            reject(parseError);
                        }
                    }
                }
            );
        });
    }


    getPortfolio(accountIdKey: string): Promise<PortfolioResponse | null> {
        return new Promise((resolve, reject) => {
            oauthClient.get(
                `https://api.etrade.com/v1/accounts/${accountIdKey}/portfolio?view=COMPLETE`,
                this.accessToken,
                this.accessTokenSecret,
                async (err, result, response) => {
                    if (err) {
                        console.log("\nFailed to get portfolio");
                        console.error(err);
                        reject(err);
                    } else {
                        if (!result) {
                            resolve(null);
                        } else {
                            const portfolio = await parsePortfolioResponseXmlToJson(
                                result as string
                            );
                            resolve(portfolio);
                        }
                    }
                }
            );
        });
    }

    async getTransactions(accountIdKey: string): Promise<Transaction[]> {
        return new Promise((resolve, reject) => {
            oauthClient.get(
                `
                    https://api.etrade.com/v1/accounts/${accountIdKey}/transactions?
                    fromDate=01012024&endDate=${dayjs().format("MMDDYYYY")}
                `,
                this.accessToken,
                this.accessTokenSecret,
                async (err, result, response) => {
                    if (err) {
                        console.log("\nFailed to get transactions");
                        console.error(err);
                        reject(err);
                    } else {
                        try {
                            const transactions = await parseTransactionsResponseXmlToJson(
                                result as string
                            );
                            resolve(transactions);
                        } catch (parseError) {
                            console.error("\nError parsing transaction list", parseError);
                            reject(parseError);
                        }
                    }
                }
            );
        });
    }

    async calcuateTrades(accounts: Account[]): Promise<void> {
        const promises: Transaction[][] = [];
        for (const account of accounts) {
            promises.push(await this.getTransactions(account.accountIdKey));
        }
        const txnsFromAllAccounts = await Promise.all(promises);

        if (!txnsFromAllAccounts || txnsFromAllAccounts.length === 0) {
            console.log(txnsFromAllAccounts);
            console.log(`No transactions in last 30 days`);
            return;
        }
        if (txnsFromAllAccounts) {
            txnsFromAllAccounts.forEach(txns => {
                txns.forEach(txn => {
                    pf.trades.annual.total += 1;

                    // annual ______________
                    if (txn.transactionType === undefined) {
                        console.log(util.inspect(txn, false, null, true));
                        process.exit(1);
                    }

                    if (txn.transactionType.includes("Dividend")) {
                        pf.dividends.annual += parseFloat(txn.amount);
                    }

                    if (txn.brokerage[0].product[0].securityType.includes("EQ" || "ETF" || "MF")) {
                        pf.trades.annual.eqBondsEtfsMfs.total += 1;
                        if (txn.transactionType.includes("Bought")) {
                            pf.trades.annual.eqBondsEtfsMfs.buy.count += 1;
                            pf.trades.annual.eqBondsEtfsMfs.buy.amount += parseFloat(txn.amount);
                        }
                        if (txn.transactionType.includes("Sold")) {
                            pf.trades.annual.eqBondsEtfsMfs.sell.count += 1;
                            pf.trades.annual.eqBondsEtfsMfs.sell.amount += parseFloat(txn.amount);
                        }
                    }

                    if (txn.brokerage[0].product[0].securityType.includes("OPTN")) {
                        pf.trades.annual.options.total += 1;
                        if (txn.brokerage[0].product[0].callPut.includes("CALL")) { // call is buying
                            pf.trades.annual.options.buy.count += 1;
                            pf.trades.annual.options.buy.amount += parseFloat(txn.amount);
                        }
                        if (txn.brokerage[0].product[0].callPut.includes("PUT")) { // put is selling
                            pf.trades.annual.options.sell.count += 1;
                            pf.trades.annual.options.sell.amount += parseFloat(txn.amount);
                        }
                    }

                    // monthly ______________
                    const date = new Date(parseFloat(txn.transactionDate)).getMonth();
                    const current = new Date().getMonth();

                    if (date === current) {
                        pf.trades.monthly.total += 1;
                        if (txn.transactionType.includes("Dividend")) {
                            pf.dividends.monthly += parseFloat(txn.amount);
                        }

                        if (txn.brokerage[0].product[0].securityType.includes("EQ" || "ETF" || "MF")) {
                            pf.trades.monthly.eqBondsEtfsMfs.total += 1;
                            if (txn.transactionType.includes("Bought")) {
                                pf.trades.monthly.eqBondsEtfsMfs.buy.count += 1;
                                pf.trades.monthly.eqBondsEtfsMfs.buy.amount += parseFloat(txn.amount);
                            }
                            if (txn.transactionType.includes("Sold")) {
                                pf.trades.monthly.eqBondsEtfsMfs.sell.count += 1;
                                pf.trades.monthly.eqBondsEtfsMfs.sell.amount += parseFloat(txn.amount);
                            }
                        }

                        if (txn.brokerage[0].product[0].securityType.includes("OPTN")) {
                            pf.trades.monthly.options.total += 1;
                            if (txn.brokerage[0].product[0].callPut.includes("CALL")) { // call is buying
                                pf.trades.monthly.options.buy.count += 1;
                                pf.trades.monthly.options.buy.amount += parseFloat(txn.amount);
                            }
                            if (txn.brokerage[0].product[0].callPut.includes("PUT")) { // put is selling
                                pf.trades.monthly.options.sell.count += 1;
                                pf.trades.monthly.options.sell.amount += parseFloat(txn.amount);
                            }
                        }
                    }
                });
            })
        }
    }

    async dailyOrders(accounts: Account[]): Promise<void> {
        const promises: Order[] = [];
        for (const account of accounts) promises.push(await this.listOrders(account.accountIdKey));
        const orders = await Promise.all(promises);

        orders.forEach(order => {
            if (order && order.OrderDetail !== undefined) {
                order.OrderDetail.forEach(odr => {
                    pf.todaysUpdate.orders.total += 1;
                    if (odr.status === 'EXPIRED') pf.todaysUpdate.orders.expired += 1;
                    if (odr.status === 'CANCELLED') pf.todaysUpdate.orders.cancelled += 1;
                    if (odr.status === 'EXECUTED') pf.todaysUpdate.orders.filled += 1;
                })
            }
        });
    }

    async setToppersAndLosers(): Promise<void> {
        this.holdings.sort((a, b) => b.daysGain - a.daysGain);
        for (let i = 0; i < 3; i++) { // top gainers
            if (
                this.holdings[i].symbol &&
                !pf.todaysUpdate.top3Gainers.includes(this.holdings[i].symbol)
            )
                pf.todaysUpdate.top3Gainers.push(this.holdings[i].symbol);
        }

        this.holdings.reverse();
        for (let i = 0; i < 3; i++) { // top losers
            if (this.holdings[i].symbol) {
                if (!pf.todaysUpdate.top3Losers.includes(this.holdings[i].symbol)) {
                    // top3gainers and losers do not match
                    pf.todaysUpdate.top3Losers.push(this.holdings[i].symbol);
                }
            }
        }
    }

    async calculateMain(accounts: Account[]) {
        let td = 0;
        let d = 0;
        for (const account of accounts) {
            console.log(`Calculating positions for ${account.accountDesc}`);

            const pfr = await this.getPortfolio(account.accountIdKey);
            if (pfr) {
                pfr.PortfolioResponse.Position.forEach((p) => {
                    // _____________________ dividends _____________________
                    td += parseFloat(p.Complete.annualDividend as unknown as string);
                    d += parseFloat(p.Complete.dividend as unknown as string);

                    // _____________________ total days gain _____________________
                    pf.todaysUpdate.daysGain += parseFloat(p.daysGain);

                    this.holdings.push({
                        symbol: p.Product.symbol,
                        daysGain: parseFloat(p.daysGain),
                    });

                    // ______________________ call/put indicator which one to choose while choosing losers and gainers ______________________
                    pf.todaysUpdate.anualGain.amount += parseFloat(p.totalGain);
                    if (p.positionType == "SHORT") pf.todaysUpdate.anualGain.shortTerm += parseFloat(p.totalGain);
                    if (p.positionType == "LONG") pf.todaysUpdate.anualGain.longTerm += parseFloat(p.totalGain);
                });
            }

            // ______________________ round amounts after finalization ______________________
            pf.investedAmount = Math.round(pf.investedAmount);
            pf.todaysUpdate.daysGain = Math.round(pf.todaysUpdate.daysGain);
            pf.todaysUpdate.anualGain.amount = Math.round(pf.todaysUpdate.anualGain.amount);
            pf.todaysUpdate.anualGain.shortTerm = Math.round(pf.todaysUpdate.anualGain.shortTerm);
            pf.todaysUpdate.anualGain.longTerm = Math.round(pf.todaysUpdate.anualGain.longTerm);
        }

        console.log("Dividend annual:", td);
        console.log("Dividend monthly:", d);
    }

    async constructPortfolio(accounts: Account[]): Promise<void> {
        // ______________ Today's day and date _________________
        pf.day = dayjs().format("dddd");
        pf.date = dayjs().format("YYYY-MM-DD");

        // __________________ Total Accounts __________________
        pf.totalAccounts = accounts.length;

        const promises: BalanceResponse[] = [];

        for (const account of accounts) {
            promises.push(
                await this.getAccountBalances(
                    account.accountIdKey,
                    account.institutionType
                )
            );
            // _____________ Retirement Accounts ________________
            if (account.accountDesc.includes("IRA") || account.accountType.includes("IRA")) pf.retirementAccounts += 1;
        }
        // _________________ Non-retirement accounts _________________
        pf.nonRetirementAccounts = accounts.length - pf.retirementAccounts;

        console.log("\nGetting account balances...");
        const balances = await Promise.all(promises);

        console.log("\nCalculating total cash...");
        balances.forEach((bl) => {
            // _______________ Total Cash Reserve ___________________
            pf.cashReserveAmount += parseFloat(bl.Computed.cashBuyingPower);
            // _______________ Total Assests value ___________________
            pf.investedAmount += parseFloat(bl.Computed.RealTimeValues.totalAccountValue);
        });

        console.log("\nCalculating total invested amount and dividends...");
        await this.calculateMain(accounts);

        // _________________________ Toppers and Losers ________________________________
        console.log("\nCalculating toppers and losers...");
        await this.setToppersAndLosers();

        // ______________________ Daily orders _________________________
        console.log("\nCalculating orders...");
        await this.dailyOrders(accounts);

        // ________________________ Stock, ETFs, MFS, Bonds _________________________


        // ________________________ Trades _________________________
        console.log("\nCalculating trades...");
        await this.calcuateTrades(accounts);
    }
}


(async function doo() {
    const et = new EtradeAccount(process.env.ACCESS_TOKEN, process.env.ACCESS_TOKEN_SECRET);

    try {
        const accounts = await et.listAccounts();
        if (accounts && accounts.length > 0) {
            await et.constructPortfolio(accounts);
            console.log(util.inspect(pf, false, null, true));

            /*       const message = prepareMessage(pf);
                  console.log("Message", message);
                  const audioMessagePath = await tts(message);
                  await sendEmail(
                      "iampawanmkr@gmail.com", // dhaval_p_shah@yahoo.com
                      "E*Trade Daily Updates",
                      "Please listen to the audio for details.",
                      audioMessagePath
                  ); */
        }
    } catch (error) {
        console.error(error);
    }
})();
