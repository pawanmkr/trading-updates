/* import { Portfolio } from "src/lib/portfolio";

export default function prepareMessage(pf: Portfolio): string {
    const {
        day,
        date,
        totalAccounts,
        retirementAccounts,
        retirementAccountsValue,
        nonRetirementAccounts,
        nonRetirementAccountsValue,
        investedAmount,
        cashReserveAmount,
        todaysUpdate,
        stockEtfsMfsBonds,
        dividends,
        trades,
    } = pf;

    // Craft the message

    let message = `Hi there! This is your investment update for ${day}, ${date}. 
    Across your ${totalAccounts} accounts, your total investment sits at $${investedAmount.toFixed(2)}. This includes $${retirementAccountsValue.toFixed(2)} in your ${retirementAccounts} retirement accounts, making up ${((retirementAccountsValue / investedAmount) * 100).toFixed(1)}% of the portfolio, and $${nonRetirementAccountsValue.toFixed(2)} in your ${nonRetirementAccounts} non-retirement accounts. You also have $${cashReserveAmount.toFixed(2)} in cash reserves.`;

    // Today's Performance
    message += `\nLooking at today's performance, your portfolio gained $${todaysUpdate.daysGain.toFixed(2)}. 
    The top gainers for the day were ${todaysUpdate.top3Gainers.join(', ')}. 
    Unfortunately, there were also some losers, including ${todaysUpdate.top3Losers.join(', ')}. 
    Overall for the year, your portfolio is down $${todaysUpdate.anualGain.amount.toFixed(2)}. This includes short-term losses of $${todaysUpdate.anualGain.shortTerm.toFixed(2)} and long-term losses of $${todaysUpdate.anualGain.longTerm.toFixed(2)}.`;

    // Stock Performance
    message += `\nWithin your stock, ETF, and mutual fund holdings, there was an overall change of ${stockEtfsMfsBonds.change}%. 
    The top performers today were ${stockEtfsMfsBonds.top3.map(holding => holding.name).join(', ')} while ${stockEtfsMfsBonds.bottom3.map(holding => holding.name).join(', ')} lagged behind.`;

    // Trading Activity
    const totalAnnualTrades = trades.annual.total;
    const totalMonthlyTrades = trades.monthly.total;
    message += `\nThroughout the year, you've made a total of ${totalAnnualTrades} trades. This includes ${trades.annual.buy.count} buys totaling $${trades.annual.buy.amount.toFixed(2)} and ${trades.annual.sell.count} sells totaling $${trades.annual.sell.amount.toFixed(2)}. There were also ${trades.annual.options.total} options trades, with ${trades.annual.options.buy.count} buys and ${trades.annual.options.sell.count} sells specifically for options. Looking at your monthly activity, you've made ${totalMonthlyTrades} trades, with a focus on buying at ${trades.monthly.buy.count} trades for $${trades.monthly.buy.amount.toFixed(2)}.`;

    // Dividends
    message += `\nOn the dividend front, you've earned a total of $${dividends.annual.toFixed(2)} in annual dividends and $${dividends.monthly.toFixed(2)} in monthly dividends.`;

    // Conclusion
    message += `\nThat's a summary of your investment activity. Remember, this is just a quick update, so be sure to review your portfolio for a more detailed breakdown.`;

    return message;
}
 */