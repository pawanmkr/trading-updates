import * as oauth from 'oauth';
import { Account, BalanceResponse, parseBalanceResponseXmlToJson, parseEtradeXmlAccountList, parsePortfolioResponseXmlToJson, PortfolioResponse } from './account-helper.js';
import { configDotenv } from "dotenv"
import pf from './portfolio.js';
configDotenv();

// prod keys
const consumerKey = 'c1d9bf52628e0a68e317d82bcfcc615c';
const consumerSecret = '86436f4a2c2ab89d4c67e53734244b7f788470823405dd7337698fad66ee5423';
const oauthClient = new oauth.OAuth(
    'https://api.etrade.com/oauth/request_token',
    'https://api.etrade.com/oauth/access_token',
    consumerKey,
    consumerSecret,
    '1.0',
    'oob', // Out-of-band for manual code grant
    'HMAC-SHA1'
);

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
                'https://api.etrade.com/v1/accounts/list',
                this.accessToken,
                this.accessTokenSecret,
                async (err, result, response) => {
                    if (err) {
                        console.log("\nFailed to list accounts");
                        console.error(err);
                        reject(err);
                    } else {
                        try {
                            const accounts = await parseEtradeXmlAccountList(result as string);
                            const activeAccounts = accounts.filter(ac => ac.accountStatus === 'ACTIVE');
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


    async getAccountBalances(accountIdKey: string, institutionType: string): Promise<BalanceResponse> {
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


    getPortfolio(accountIdKey: string): Promise<PortfolioResponse | null> {
        return new Promise((resolve, reject) => {
            oauthClient.get(
                `https://api.etrade.com/v1/accounts/${accountIdKey}/portfolio`,
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
                            const portfolio = await parsePortfolioResponseXmlToJson(result as string);
                            resolve(portfolio);
                        }

                    }
                }
            );
        });
    }


    async getDataFromAccount(accounts: Account[]): Promise<any> {
        const promises: BalanceResponse[] = [];
        for (const account of accounts) {
            promises.push(await this.getAccountBalances(account.accountIdKey, account.institutionType));
        }
        const balances = await Promise.all(promises);

        const retirementAccountType = ['ROTHIRA', 'ROLLOVERIRA'];

        console.log("Calculating total cash...");
        let totalCash: number = 0;
        balances.forEach(bl => {
            totalCash += parseFloat(bl.Computed.netCash);
        });
        pf.cashReserveAmount = Math.round(totalCash);

        pf.totalAccounts = accounts.length;

        let totalRetirementAccounts = 0;
        accounts.forEach(ac => {
            retirementAccountType.forEach(rat => {
                if (ac.accountType === rat) totalRetirementAccounts++;
            })
        });
        pf.retirementAccounts = totalRetirementAccounts;
        pf.nonRetirementAccounts = accounts.length - pf.retirementAccounts;

        let totalInvestedAmount: number = 0;
        console.log("Calculating total invested amount...");
        for (const account of accounts) {
            const pfr = await this.getPortfolio(account.accountIdKey);
            if (pfr) {
                pfr.PortfolioResponse.Position.forEach(p => totalInvestedAmount += parseFloat(p.marketValue))
            }
        }
        pf.investedAmount = Math.round(totalInvestedAmount);
        console.log("\nUpdated portfolio:", pf);
    }
}

(async function doo() {
    const et = new EtradeAccount(process.env.ACCESS_TOKEN, process.env.ACCESS_TOKEN_SECRET);

    try {
        const accounts = await et.listAccounts();
        if (accounts && accounts.length > 0) {
            const data = await et.getDataFromAccount(accounts);
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
})();
