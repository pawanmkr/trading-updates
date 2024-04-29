import * as oauth from 'oauth';
import readline from "readline";


import { EtradeAccount } from './accounts.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const consumerKey = 'c1d9bf52628e0a68e317d82bcfcc615c';
const consumerSecret = '86436f4a2c2ab89d4c67e53734244b7f788470823405dd7337698fad66ee5423';

export const oauthClient = new oauth.OAuth(
    'https://api.etrade.com/oauth/request_token',
    'https://api.etrade.com/oauth/access_token',
    consumerKey,
    consumerSecret,
    '1.0',
    'oob', 
    'HMAC-SHA1'
);

let oauth_token: string, oauth_token_secret: string;

oauthClient.getOAuthRequestToken({}, (error, oauth_token, oauth_token_secret) => {
    if (error) {
        console.log('Error obtaining request token');
        console.error(error);
        return;
    }

    console.log(`Request Token: ${oauth_token}`);
    console.log(`Token Secret: ${oauth_token_secret}`);

    const authorizationUrl = `https://us.etrade.com/e/t/etws/authorize?key=${consumerKey}&token=${oauth_token}`;
    console.log(`\nOpen this URL in your browser, authorize the application and then copy the verification code from browser.`);
    console.log(authorizationUrl);

    // Prompt the user to enter the verification code after they authorize the app
    rl.question("\nEnter the copied verification code from E*Trade: ", (verificationCode) => {
        rl.close();

        oauthClient.getOAuthAccessToken(
            oauth_token,
            oauth_token_secret,
            verificationCode,
            (error, oauth_token, oauth_token_secret) => {
                if (error) {
                    console.error('Error obtaining access token:', error);
                    return;
                }

                console.log('\nAccess Token:', oauth_token);
                console.log('Access Token Secret:', oauth_token_secret);

                // const et = new EtradeAccount(oauth_token, oauth_token_secret);
                // et.listAccounts();
            }
        );
    });
});
