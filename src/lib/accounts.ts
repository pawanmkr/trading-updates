import { configDotenv } from "dotenv";
import * as oauth from "oauth";
import util from "node:util";
import dayjs from "dayjs";
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
import prepareMessage from "../utils/message.js";
import tts from "../services/tts.js";
import { sendEmail } from "../services/mail.js";
import fs from 'fs';


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
    retirementAccounts: Set<string>;

    constructor(accessToken: string, accessTokenSecret: string) {
        this.accessToken = accessToken;
        this.accessTokenSecret = accessTokenSecret;
        this.retirementAccounts = new Set<string>();
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
                            const balances = await parseBalanceResponseXmlToJson(result as string);
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

    async listOrders(accountIdKey: string): Promise<Order[] | null> {
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
                                const orders = await parseOrdersResponseXmlToJson(result as string);
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
                `https://api.etrade.com/v1/accounts/${accountIdKey}/portfolio?view=QUICK`,
                this.accessToken,
                this.accessTokenSecret,
                async (err, result, response) => {
                    if (err) {
                        console.log("\nFailed to get portfolio");
                        console.error(err);
                        console.log(accountIdKey);
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

    async getTransactions(accountIdKey: string): Promise<Transaction[] | null> {
        return new Promise((resolve, reject) => {
            oauthClient.get(
                `
                    https://api.etrade.com/v1/accounts/${accountIdKey}/transactions?
                    fromDate=04012024&endDate=${dayjs().format("MMDDYYYY")}
                `,
                this.accessToken,
                this.accessTokenSecret,
                async (err, result, response) => {
                    if (err) {
                        console.log("\nFailed to get transactions");
                        console.error(err);
                        reject(err);
                    } else {
                        if (response.statusCode === 200) {
                            try {
                                const transactions = await parseTransactionsResponseXmlToJson(result as string);
                                resolve(transactions);
                            } catch (parseError) {
                                console.error("\nError parsing transaction list", parseError);
                                reject(parseError);
                            }
                        }
                    }
                }
            );
        });
    }

    async calcuateTrades(accounts: Account[]): Promise<void> {
        console.log("\nCalculating trades...");

        const promises: Transaction[][] = [];
        for (const account of accounts) {
            promises.push(await this.getTransactions(account.accountIdKey));
        }
        const txnsFromAllAccounts = await Promise.all(promises);
        console.log(util.inspect(txnsFromAllAccounts, true, null, true));

        if (!txnsFromAllAccounts || txnsFromAllAccounts.length === 0) {
            console.log(txnsFromAllAccounts);
            console.log(`No transactions in last 30 days`);
            return;
        }
        if (txnsFromAllAccounts) {
            console.log(util.inspect(txnsFromAllAccounts, true, null, true));

            const data = JSON.stringify(txnsFromAllAccounts);
            const filePath = 'transactions_onemonth.json';

            fs.writeFile(filePath, data, (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                    return;
                }
                console.log('Array data written to file successfully!');
            });

            txnsFromAllAccounts.forEach(txns => {
                txns.forEach(txn => {
                    pf.trades.annual.total += 1;

                    // annual ______________
                    if (txn.transactionType === undefined) {
                        console.log(util.inspect(txn, false, null, true));
                    }

                    if (txn.transactionType.includes("Dividend" || "dividend")) {
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

        // annual total
        pf.trades.annual.buy.amount = pf.trades.annual.eqBondsEtfsMfs.buy.amount + pf.trades.annual.options.buy.amount;
        pf.trades.annual.buy.count = pf.trades.annual.eqBondsEtfsMfs.buy.count + pf.trades.annual.options.buy.count;
        pf.trades.annual.sell.amount = pf.trades.annual.eqBondsEtfsMfs.sell.amount + pf.trades.annual.options.sell.amount;
        pf.trades.annual.sell.count = pf.trades.annual.eqBondsEtfsMfs.sell.count + pf.trades.annual.options.sell.count;

        // monthly total
        pf.trades.monthly.buy.amount = pf.trades.monthly.eqBondsEtfsMfs.buy.amount + pf.trades.monthly.options.buy.amount;
        pf.trades.monthly.buy.count = pf.trades.monthly.eqBondsEtfsMfs.buy.count + pf.trades.monthly.options.buy.count;
        pf.trades.monthly.sell.amount = pf.trades.monthly.eqBondsEtfsMfs.sell.amount + pf.trades.monthly.options.sell.amount;
        pf.trades.monthly.sell.count = pf.trades.monthly.eqBondsEtfsMfs.sell.count + pf.trades.monthly.options.sell.count;

        // round off amounts
        pf.trades.annual.eqBondsEtfsMfs.buy.amount = Math.round(pf.trades.annual.eqBondsEtfsMfs.buy.amount);
        pf.trades.annual.eqBondsEtfsMfs.sell.amount = Math.round(pf.trades.annual.eqBondsEtfsMfs.sell.amount);
        pf.trades.annual.options.buy.amount = Math.round(pf.trades.annual.options.buy.amount);
        pf.trades.annual.options.sell.amount = Math.round(pf.trades.annual.options.sell.amount);
        pf.trades.annual.buy.amount = Math.round(pf.trades.annual.buy.amount);
        pf.trades.annual.sell.amount = Math.round(pf.trades.annual.sell.amount);
        // monthly
        pf.trades.monthly.eqBondsEtfsMfs.buy.amount = Math.round(pf.trades.monthly.eqBondsEtfsMfs.buy.amount);
        pf.trades.monthly.eqBondsEtfsMfs.sell.amount = Math.round(pf.trades.monthly.eqBondsEtfsMfs.sell.amount);
        pf.trades.monthly.options.buy.amount = Math.round(pf.trades.monthly.options.buy.amount);
        pf.trades.monthly.options.sell.amount = Math.round(pf.trades.monthly.options.sell.amount);
        pf.trades.monthly.buy.amount = Math.round(pf.trades.monthly.buy.amount);
        pf.trades.monthly.sell.amount = Math.round(pf.trades.monthly.sell.amount);
        // dividends
        pf.dividends.annual = Math.round(pf.dividends.annual);
        pf.trades.annual.buy.amount = Math.round(pf.trades.annual.buy.amount);
    }

    async dailyOrders(accounts: Account[]): Promise<void> {
        console.log("\nCalculating orders...");

        const promises: Order[][] = [];
        for (const account of accounts) promises.push(await this.listOrders(account.accountIdKey));
        const ordersFromAllAccounts = await Promise.all(promises);

        if (ordersFromAllAccounts.length > 0) {
            ordersFromAllAccounts.forEach(orders => {
                if (orders) {
                    orders.forEach(order => {
                        pf.todaysUpdate.orders.total += 1;
                        if (order.OrderDetail[0].status === 'EXPIRED') pf.todaysUpdate.orders.expired += 1;
                        if (order.OrderDetail[0].status === 'CANCELLED') pf.todaysUpdate.orders.cancelled += 1;
                        if (order.OrderDetail[0].status === 'EXECUTED') pf.todaysUpdate.orders.filled += 1;
                    });
                }
            });
        }
    }

    async setToppersAndLosers(): Promise<void> {
        console.log("\nCalculating toppers and losers...");

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

    async calculateCashReserve(balances: BalanceResponse[]) {
        console.log("\nCalculating cash reserve...");

        balances.forEach((bl) => {
            // _______________ Total Cash Reserve ___________________
            pf.cashReserveAmount.set(`${bl.accountId}__${bl.accountType}__${bl.accountDescription}`, parseFloat(bl.Computed.cashAvailableForInvestment));

            // _______________ Total Assests value ___________________
            pf.investedAmount += parseFloat(bl.Computed.RealTimeValues.totalAccountValue);

            // _______________ Assets in Retirement vs Non-Retirement ___________________
            if (this.retirementAccounts.has(bl.accountId)) {
                pf.retirementAccountsValue += parseFloat(bl.Computed.RealTimeValues.totalAccountValue);
            } else {
                pf.nonRetirementAccountsValue += parseFloat(bl.Computed.RealTimeValues.totalAccountValue);
            }
        });

        // _______________ Round off amounts ___________________
        pf.investedAmount = Math.round(pf.investedAmount);
        pf.retirementAccountsValue = Math.round(pf.retirementAccountsValue);
        pf.nonRetirementAccountsValue = Math.round(pf.nonRetirementAccountsValue);
    }

    async getBalancesFromAllAccounts(accounts: Account[]): Promise<BalanceResponse[]> {
        console.log("\nGetting account balances...");

        const promises: BalanceResponse[] = [];
        for (const account of accounts) {
            promises.push(
                await this.getAccountBalances(
                    account.accountIdKey,
                    account.institutionType
                )
            );

            // _____________ Retirement Accounts ________________
            if (account.accountDesc.includes("IRA") || account.accountType.includes("IRA")) {
                pf.retirementAccounts += 1;
                this.retirementAccounts.add(account.accountId);
            };
        }
        // _________________ Non-retirement accounts _________________
        pf.nonRetirementAccounts = accounts.length - pf.retirementAccounts;

        const balances = await Promise.all(promises);
        return balances;
    }

    async calculateMain(accounts: Account[]) {
        console.log("\nCalculating total invested amount and dividends...");

        const assets = [];

        for (const account of accounts) {
            console.log(`Calculating positions for ${account.accountDesc}`);

            let pfr: PortfolioResponse;
            try {
                pfr = await this.getPortfolio(account.accountIdKey);
            } catch (error) {
                console.log(util.inspect(account, false, null, true));
                console.log("found");
                process.exit(1);
            }
            if (pfr) {
                pfr.PortfolioResponse.Position.forEach((p) => {

                    // _____________________ stocks, etfs, mfs, and bonds _____________________
                    if (p.Product.securityType.includes("EQ" || "MF" || "BOND" || "MMF")) {
                        pf.stockEtfsMfsBonds.change += parseFloat(p.Quick.change);
                        assets.push({
                            symbol: p.Product.symbol,
                            change: parseFloat(p.daysGain),
                        });
                    }

                    // _____________________ total days gain _____________________
                    pf.todaysUpdate.daysGain += parseFloat(p.daysGain);

                    this.holdings.push({
                        symbol: p.Product.symbol,
                        daysGain: parseFloat(p.daysGain),
                    });

                    const txnDate = new Date(parseFloat(p.dateAcquired)).getTime();
                    const currentDate = new Date();
                    const yearAgoEpochTime = new Date(currentDate.setFullYear(currentDate.getFullYear() - 1)).getTime();

                    // ________________________ check if it is a long term or short term gain ________________________
                    pf.todaysUpdate.anualGain.amount += parseFloat(p.totalGain);
                    if (txnDate > yearAgoEpochTime) pf.todaysUpdate.anualGain.shortTerm += parseFloat(p.totalGain);
                    if (txnDate < yearAgoEpochTime) pf.todaysUpdate.anualGain.longTerm += parseFloat(p.totalGain);
                });
            }

            // ______________________ round amounts after finalization ______________________
            pf.investedAmount = Math.round(pf.investedAmount);
            pf.todaysUpdate.daysGain = Math.round(pf.todaysUpdate.daysGain);
            pf.todaysUpdate.anualGain.amount = Math.round(pf.todaysUpdate.anualGain.amount);
            pf.todaysUpdate.anualGain.shortTerm = Math.round(pf.todaysUpdate.anualGain.shortTerm);
            pf.todaysUpdate.anualGain.longTerm = Math.round(pf.todaysUpdate.anualGain.longTerm);

            // ______________________ dividends ______________________
            pf.dividends.annual = Math.round(pf.dividends.annual);
            pf.dividends.monthly = Math.round(pf.dividends.monthly);
        }

        assets.sort((a, b) => b.daysGain - a.daysGain);
        for (let i = 0; i < 3; i++) { // top 3
            if (
                assets[i].symbol &&
                !pf.stockEtfsMfsBonds.top3.includes(assets[i].symbol)
            )
                pf.stockEtfsMfsBonds.top3.push(assets[i].symbol);
        }

        assets.reverse();
        for (let i = 0; i < 3; i++) { // top losers 3
            if (assets[i].symbol) {
                if (!pf.stockEtfsMfsBonds.bottom3.includes(assets[i].symbol)) {
                    pf.stockEtfsMfsBonds.bottom3.push(assets[i].symbol);
                }
            }
        }

        pf.stockEtfsMfsBonds.change = Math.round(pf.stockEtfsMfsBonds.change);
    }

    async constructPortfolio(accounts: Account[]): Promise<void> {
        // ______________ Today's day and date _________________
        pf.day = dayjs().format("dddd");
        pf.date = dayjs().format("YYYY-MM-DD");

        pf.totalAccounts = accounts.length;

        const balances = await this.getBalancesFromAllAccounts(accounts);

        await this.calculateCashReserve(balances);

        await this.calculateMain(accounts);

        await this.setToppersAndLosers();

        await this.dailyOrders(accounts);

        // await this.calcuateTrades(accounts);
    }
}


(async function doo() {
    const et = new EtradeAccount(process.env.ACCESS_TOKEN, process.env.ACCESS_TOKEN_SECRET);

    try {
        const accounts = await et.listAccounts();
        if (accounts && accounts.length > 0) {
            await et.constructPortfolio(accounts);
            console.log("\n here --------> ")
            console.log(util.inspect(pf, false, null, true));

            const message = prepareMessage(pf);
            console.log(message);

            const audioMessagePath = await tts(message);
            await sendEmail(
                "iampawanmkr@gmail.com", // dhaval_p_shah@yahoo.com
                "Daily Updates",
                "Please listen to the audio for details.",
                audioMessagePath
            );
        }
    } catch (error) {
        console.error(error);
    }
})();
