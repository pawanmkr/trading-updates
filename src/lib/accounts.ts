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
} from "./account-helper.js";
import pf from "./portfolio.js";
import prepareMessage from "../utils/message.js";
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
        `https://api.etrade.com/v1/accounts/${accountIdKey}/balance?instType=${institutionType}&amp;realTimeNAV=true`,
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

  async listOrders(accountIdKey: string): Promise<Order> {
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
              const orders = await parseOrdersResponseXmlToJson(
                result as string
              );
              // console.log(
              //   "---------------ORders-----------------",
              //   util.inspect(orders, true, null, true)
              // );
              resolve(orders);
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
            /* {
                            accountId: '712718900',
                            accountIdKey: 'b_FQVrEiQzLgZbWoqU0lCg',
                            accountMode: 'CASH',
                            accountDesc: 'Retail Brokerage',
                            accountName: 'Retail Brokerage',
                            accountType: 'INDIVIDUAL',
                            institutionType: 'BROKERAGE',
                            accountStatus: 'ACTIVE',
                            closedDate: '0',
                            shareWorksAccount: false,
                            fcManagedMssbClosedAccount: false
                        } */
            // Can't fetch portfolio for this account will troubleshoot later.

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

  async getTransactions(accountIdKey: string): Promise<any> {
    return new Promise((resolve, reject) => {
      oauthClient.get(
        `https://api.etrade.com/v1/accounts/${accountIdKey}/transactions`,
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
              console.error("\nError parsing order list", parseError);
              reject(parseError);
            }
          }
        }
      );
    });
  }
  async analyzeTrades(accountIdKey: string): Promise<void> {
    try {
      // Fetch transactions for the account
      console.log("Fetching transactions...");

      const transactionResponse = await this.getTransactions(accountIdKey);

      const transactions =
        transactionResponse?.TransactionListResponse.Transaction;

      if (!Array.isArray(transactions)) {
        console.error("Transactions is not an array");
        return;
      }

      // Filter transactions for the current month
      const currentMonthTransactions = transactions.filter((transaction) => {
        const transactionDate = new Date(
          parseInt(transaction.transactionDate[0])
        );
        const transactionMonth = transactionDate.getMonth();
        const transactionYear = transactionDate.getFullYear();
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        return (
          transactionMonth === currentMonth && transactionYear === currentYear
        );
      });
      // formatting transaction date
      currentMonthTransactions.forEach((transaction) => {
        const transactionDateTimestamp = parseInt(
          transaction.transactionDate[0]
        );
        const transactionDate = new Date(transactionDateTimestamp);
        const formattedTransactionDate =
          transactionDate.toLocaleDateString("en-US");

        // fromat postdte
        const postDateTimestamp = parseInt(transaction.postDate[0]);
        const postDate = new Date(postDateTimestamp);
        const formattedPostDate = postDate.toLocaleDateString("en-US");

        // Update transaction object with formatted dates
        transaction.transactionDate = formattedTransactionDate;
        transaction.postDate = formattedPostDate;
      });
      console.log(
        "Current Month Transactions-------------------------->",
        currentMonthTransactions
      );

      let totalGains = 0;
      let totalLosses = 0;
      // ____ bought ___
      const bought = currentMonthTransactions.filter((transaction) =>
        transaction.transactionType[0].toLowerCase().includes("bought")
      );
      const symbolsBoughtWithPriceAndQuantity = bought.map((b) => {
        return {
          symbol: b.brokerage[0].displaySymbol[0],
          quantity: b.brokerage[0].quantity[0],
          price: b.brokerage[0].price[0],
          totalPrice: Math.floor(
            parseFloat(b.brokerage[0].quantity[0]) *
              parseFloat(b.brokerage[0].price[0])
          ),
        };
      });
      // _____ sold _____
      const sold = currentMonthTransactions.filter((transaction) =>
        transaction.transactionType[0].toLowerCase().includes("sold")
      );
      const symbolsSoldWithPriceAndQuantity = sold.map((s) => {
        return {
          symbol: s.brokerage[0].product[0].symbol[0],

          price: s.brokerage[0].price[0],
        };
      });

      console.log(
        `You did ${currentMonthTransactions.length} trades this month.`
      );

      console.log(
        `You Bought ${bought.length} stocks and Sold ${sold.length} stocks this month.`
      );
      // __________ Console log the bought transactions____________
      symbolsBoughtWithPriceAndQuantity.forEach((s) => {
        // Extract transaction details
        const symbol = s.symbol;
        const quantity = parseInt(s.quantity);
        const totalPrice = s.totalPrice;

        const message = `You purchased ${symbol} with a quantity of ${quantity} and a total price of $${totalPrice} in this month.`;

        console.log(message);
      });
      // __________ Console log the Sold transactions____________
      symbolsSoldWithPriceAndQuantity.forEach((s) => {
        // Extract transaction details
        const symbol = s.symbol;

        const message = `You Sold ${symbol} with price of $${s.price} in this month`;

        console.log(message);
      });
    } catch (error) {
      console.error("Error analyzing trades:", error);
    }
  }

  async constructPortfolio(accounts: Account[]): Promise<void> {
    const promises: BalanceResponse[] = [];
    console.log("-----------------Accounts------------------------", accounts);
    console.log(accounts.length);

    for (const account of accounts) {
      promises.push(
        await this.getAccountBalances(
          account.accountIdKey,
          account.institutionType
        )
      );
    }

    const balances = await Promise.all(promises);
    console.log(util.inspect(balances, true, null, true));
    // TODO: Fix the below code
    const retirementAccountType = ["ROTHIRA", "ROLLOVERIRA"];

    pf.day = dayjs().format("dddd");
    pf.date = dayjs().format("YYYY-MM-DD");

    console.log("Calculating total cash...");
    let totalCash: number = 0;
    balances.forEach((bl) => {
      totalCash += parseFloat(bl.Computed.netCash);
    });
    // _______ Total Cash Reserve ______
    pf.cashReserveAmount = Math.round(totalCash);

    // ______ Total Accounts ______
    pf.totalAccounts = accounts.length;

    // _____ Retirement and non-retirement accounts ____

    let totalRetirementAccounts = 0;

    accounts.forEach((ac) => {
      if (ac.accountType.includes("IRA")) {
        totalRetirementAccounts++;
      }
    });

    pf.retirementAccounts = totalRetirementAccounts;
    pf.nonRetirementAccounts = accounts.length - pf.retirementAccounts;

    let totalInvestedAmount: number = 0;
    let daysGain = 0;
    let holdings: Holdings[] = [];

    let gaintest = [];
    let totalAnnualDividend = 0;
    let totalDividend = 0;

    console.log("Calculating total invested amount...");
    //
    for (const account of accounts) {
      console.log(`Calculating positions for ${account.accountIdKey}`);

      const pfr = await this.getPortfolio(account.accountIdKey);
      if (pfr) {
        pfr.PortfolioResponse.Position.forEach((p) => {
          // _____________ Dividends ______________

          // const exDividendDate = p.Complete.exDividendDate;
          // const divPayDate = p.Complete.divPayDate;
          // if (exDividendDate) {
          //   console.log("exDividendDate", exDividendDate);
          //   // format exDividentData
          //   const formattedExDividendDate = format(
          //     new Date(parseInt(exDividendDate)),
          //     "dd MMMM yyyy"
          //   );
          //   console.log("Formatted exDividendDate-->", formattedExDividendDate);

          //   pf.dividends.exDividendDate =
          //     formattedExDividendDate || p.Complete.exDividendDate;
          // }
          // if (divPayDate) {
          //   console.log("divPayDate", divPayDate);
          //   // format exDividentData
          //   const formatteddivPayDate = format(
          //     new Date(parseInt(divPayDate)),
          //     "dd MMMM yyyy"
          //   );
          //   console.log("Formatted divPayDate-->", formatteddivPayDate);

          //   pf.dividends.divPayDate =
          //     formatteddivPayDate || p.Complete.divPayDate;
          // }

          totalDividend += parseFloat(p.Complete.dividend as unknown as string);
          totalAnnualDividend += parseFloat(
            p.Complete.annualDividend as unknown as string
          );

          pf.dividends.annualDividend = Math.floor(totalAnnualDividend);
          pf.dividends.dividend = Math.floor(totalDividend);

          // total invested amount
          totalInvestedAmount += parseFloat(p.marketValue);
          // total days gain
          daysGain += parseFloat(p.daysGain);

          gaintest.push({
            symbol: p.Product.symbol,
            gain: parseFloat(p.daysGain),
          });

          holdings.push({
            symbol: p.Product.symbol,
            daysGain: parseFloat(p.daysGain),
          });

          pf.todaysUpdate.anualGain.amount += parseFloat(p.totalGain);
          if (p.positionType == "SHORT")
            pf.todaysUpdate.anualGain.shortTerm += parseFloat(p.totalGain);
          if (p.positionType == "LONG")
            pf.todaysUpdate.anualGain.longTerm += parseFloat(p.totalGain);

          // if want to see the daily gains, we'll have to store the gains in db
          // we can't save is unless we use db, it can be postgres, mongodb or sqlite also.
        });
      }
      // round amounts after finalization
      pf.todaysUpdate.anualGain.amount = Math.round(
        pf.todaysUpdate.anualGain.amount
      );
      pf.todaysUpdate.anualGain.shortTerm = Math.round(
        pf.todaysUpdate.anualGain.shortTerm
      );
      pf.todaysUpdate.anualGain.longTerm = Math.round(
        pf.todaysUpdate.anualGain.longTerm
      );

      // let res = await this.listOrders(account.accountIdKey);
      // console.log(res);
      // return;
      // if (res && res.OrdersResponse.Order.length > 0) {
      //     const orders = res.OrdersResponse.Order;
      //     orders.forEach(odr => {
      //         pf.todaysUpdate.orders.total += 1;
      //         if (odr.OrderDetail[0].status === 'EXPIRED') pf.todaysUpdate.orders.expired += 1;
      //         if (odr.OrderDetail[0].status === 'CANCELLED') pf.todaysUpdate.orders.cancelled += 1;
      //         if (odr.OrderDetail[0].status === 'EXECUTED') pf.todaysUpdate.orders.filled += 1;
      //     })
      // }
    }

    pf.investedAmount = Math.round(totalInvestedAmount);
    pf.todaysUpdate.daysGain = Math.round(daysGain);

    // _________ Toppers and Losers ___________-
    holdings.sort((a, b) => b.daysGain - a.daysGain);
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Holdings", holdings);

    for (let i = 0; i < 3; i++) {
      if (
        holdings[i].symbol &&
        !pf.todaysUpdate.top3Gainers.includes(holdings[i].symbol)
      )
        pf.todaysUpdate.top3Gainers.push(holdings[i].symbol);
    }
    holdings.reverse();
    console.log(holdings);

    for (let i = 0; i < 3; i++) {
      if (holdings[i].symbol)
        if (!pf.todaysUpdate.top3Losers.includes(holdings[i].symbol)) {
          // top3gainers and losers do not match
          pf.todaysUpdate.top3Losers.push(holdings[i].symbol);
        }
    }

    console.log(util.inspect(gaintest, true, null, true));
  }
}

(async function doo() {
  const et = new EtradeAccount(
    process.env.ACCESS_TOKEN,
    process.env.ACCESS_TOKEN_SECRET
  );

  try {
    const accounts = await et.listAccounts();
    console.log(accounts);
    if (accounts && accounts.length > 0) {
      await et.analyzeTrades(accounts[0].accountIdKey);
      await et.constructPortfolio(accounts);
      await et.listOrders(accounts[0].accountIdKey);

      console.log("--->", pf);

      // const message = prepareMessage(pf);
      // const audioMessagePath = await tts(message);
      // await sendEmail(
      //     "iampawanmkr@gmail.com", // dhaval_p_shah@yahoo.com
      //     "E*Trade Daily Updates",
      //     "Please listen to the audio for details.",
      //     audioMessagePath
      // );
    }
  } catch (error) {
    console.error(error);
  }
})();

// TODO , top gainers and losers do not match
//TODO:-  Dividend ,TOtal CASH,
