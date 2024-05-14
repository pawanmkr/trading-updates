import { Portfolio } from "src/lib/portfolio";

export default function prepareMessage(pf: Portfolio): string {
    const { day, date, totalAccounts, retirementAccounts, nonRetirementAccounts, investedAmount, cashReserveAmount, todaysUpdate, dividends } = pf;

    let message = `Welcome to E-Trade. Today is ${date}, ${day}, and here is the update from your portfolio aftermarket close.\n\n`;

    message += `First, let me confirm what you have here. You have total ${totalAccounts} accounts here. ${retirementAccounts} retirement and ${nonRetirementAccounts} non-retirement account.\n`;
    message += `In terms of portfolio size, you have total $${investedAmount} in invested assets and additionally $${calculateTotalCash(cashReserveAmount)} cash in your accounts as of today. Some of them are used for naked puts you sold.\n\n`;

    message += `Now let's see major changes in your portfolio for today.\n\n`;

    message += `Let's talk about amount changes. Your portfolio grew today by $${todaysUpdate.daysGain}.\n`;
    message += `Your 3 largest gainers today in terms of dollars were ${getTopGainers(todaysUpdate.top3Gainers)} whereas Biggest Losers were ${getTopLosers(todaysUpdate.top3Losers)}.\n\n`;

    message += `Now let's talk about annual dividends.\n`;
    message += `You are expected to get $${dividends.annual} in dividends this year based on your current investment. You have received $${dividends.monthly} as of today.\n\n`;

    message += `Now, let's talk about annual gain or loss.\n`;
    message += `Your annual gain so far is $${todaysUpdate.anualGain.amount} whereas $${todaysUpdate.anualGain.shortTerm} is a short-term gain and $${todaysUpdate.anualGain.longTerm} is long-term gain.\n\n`;

    message += `Let me update you now for your orders.\n`;
    message += `Today you entered ${todaysUpdate.orders.total} orders online. ${todaysUpdate.orders.filled} of them got filled, ${todaysUpdate.orders.cancelled} got cancelled, and ${todaysUpdate.orders.expired} expired at the end of the day.\n\n`;

    message += `Now let's talk about unused cash.\n`;
    message += `You have a cash of $${calculateTotalCash(cashReserveAmount)} in your account which can be used to buy various equities without dipping into margin balance.\n\n`;

    message += `Hope this helps to know what happened today.\n`;

    return message;
}

function calculateTotalCash(cashReserveAmount: Map<string, number>): number {
    let totalCash = 0;
    cashReserveAmount.forEach((value) => {
        if (!isNaN(value)) {
            totalCash += value;
        }
    });
    return totalCash;
}

function getTopGainers(top3Gainers: string[]): string {
    return top3Gainers.slice(0, 3).join(", ");
}

function getTopLosers(top3Losers: string[]): string {
    return top3Losers.slice(0, 3).join(", ");
}
