import { Portfolio } from "src/lib/portfolio";

// This message can be customized with OpenAI everytime for each customer according to data
export default function prepareMessage(pf: Portfolio): string {
  const totalTrades = pf.tradesThisMonth.totalTrades;
  const buyTrades = pf.tradesThisMonth.buyTrades;
  const sellTrades = pf.tradesThisMonth.sellTrades;

  // Generating message for trades this month
  const tradesThisMonthMessage = `
        "You made a total of ${totalTrades} trades this month. You Bought ${buyTrades} stocks and Sold ${sellTrades} stocks this month."
    `;

  // Generating message for each trade
  const symbolsBoughtMessage =
    pf.tradesThisMonth.symbolsBoughtWithPriceAndQuantity
      .map((trade) => {
        return `You purchased ${trade.symbol} with a quantity of ${trade.quantity} and a total price of $${trade.totalPrice} in this month.`;
      })
      .join("\n");

  const symbolsSoldMessage = pf.tradesThisMonth.symbolsSoldWithPriceAndQuantity
    .map((trade) => {
      return `You sold ${trade.symbol} worth $${trade.totalPrice} in this month.`;
    })
    .join("\n");

  return `
        [Soft Chime]

        "Dear customer,"

        "We're reaching out to give you a quick update on your E*TRADE account for today, ${pf.day}, ${pf.date}. Let's dive right in."

        "You currently have a total of ${pf.totalAccounts} accounts with us, including ${pf.retirementAccounts} retirement account(s) and ${pf.nonRetirementAccounts} non-retirement account(s). Your invested amount stands at $${pf.investedAmount}, while your cash reserve amounts to $${pf.cashReserveAmount}."

        "Now, onto today's update."

        "We've seen a total gain of $${pf.todaysUpdate.daysGain} for today. Your top three gainers for the day are ${pf.todaysUpdate.top3Gainers[0]}, ${pf.todaysUpdate.top3Gainers[1]}, and ${pf.todaysUpdate.top3Gainers[2]}, while the top three losers are ${pf.todaysUpdate.top3Losers[0]}, ${pf.todaysUpdate.top3Losers[1]}, and ${pf.todaysUpdate.top3Losers[2]}."

        ${tradesThisMonthMessage}

        ${symbolsBoughtMessage}

        ${symbolsSoldMessage}

        "Looking at the bigger picture, your annual gain stands at $${pf.todaysUpdate.anualGain.amount}. This includes a short-term loss of $${pf.todaysUpdate.anualGain.shortTerm} and a long-term loss of $${pf.todaysUpdate.anualGain.longTerm}. As for your orders, there have been no transactions filled, cancelled, or expired."

        "Regarding your stocks, ETFs, mutual funds, and bonds, there haven't been any specific changes highlighted today among the top or bottom performers."

        "So, while today may not have been the most profitable, remember that we're here to support you through every twist and turn of your financial journey."

        "If you have any questions or concerns about your investments or the market, don't hesitate to reach out. We're always here to help."

        "Thanks for being a valued member of the E*TRADE family. Until next time, take care!"

        *[Soft Chime]*
    `;
}
