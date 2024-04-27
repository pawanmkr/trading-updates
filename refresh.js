// const fetch = require("fetch");

// // Replace this with a function that generates a random string
// function generateRandomString() {
//     // Implement your random string generation logic here
//     return 'your_random_string';
// }

// function generateRandomString(length = 32) {
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//     let result = '';
//     const charactersLength = characters.length;
//     for (let i = 0; i < length; i++) {
//         result += characters.charAt(Math.floor(Math.random() * charactersLength));
//     }
//     return result;
// }

async function renewEtradeAccessToken(consumerKey, consumerSecret, accessToken, callback) {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = generateRandomString(); // Replace with actual random string generation

    const signatureBaseString = `GET&https%3A%2F%2Fapi.etrade.com%2Foauth%2Frenew_access_token&oauth_consumer_key=${consumerKey}&oauth_nonce=${nonce}&oauth_signature_method=HMAC-SHA1&oauth_timestamp=${timestamp}&oauth_token=${accessToken}`;

    const signature = generateHmacSHA1Signature(signatureBaseString, consumerSecret);

    const headers = {
        Authorization: `OAuth realm="",oauth_signature="${signature}",oauth_nonce="${nonce}",oauth_signature_method="HMAC-SHA1",oauth_consumer_key="${consumerKey}",oauth_timestamp="${timestamp}"`
    };

    fetch('https://api.etrade.com/oauth/renew_access_token', {
        method: 'GET',
        headers: headers
    })
        .then(response => response.json())
        .then(data => callback(data, null))
        .catch(error => callback(null, error));
}

import dayjs from 'dayjs';

(async function doo() {
    /* await renewEtradeAccessToken(
        'c1d9bf52628e0a68e317d82bcfcc615c',
        '86436f4a2c2ab89d4c67e53734244b7f788470823405dd7337698fad66ee5423',
        'baQIgrf8kkEb3ozILK+tdaBTWHVvMPOA5zLIWyVmIUg='
    ); */

    const ts = 1712183303000;
    console.log(dayjs(ts).isAfter(dayjs().subtract(30, 'days')));

})();