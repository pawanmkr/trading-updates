# Project Description

## Objective
The goal is to integrate with various financial services/brokers to report daily changes in subscriber portfolios through a concise daily email. The email will be around 5 minutes long, encapsulating the updates within 5-10 sentences.

### Phase 1: E*Trade Integration
- **API Documentation**: [E*Trade API](https://developer.etrade.com/home)
- **Details**: Integration will focus on E*Trade for phase 1. API access will be configured to handle individual accounts and potentially merge data from multiple accounts.

## Configuration
- **Input Method**: Initial setups will utilize a configuration file. A user interface will be developed in subsequent phases.
- **Config File Contents**: Will include login, password, broker details, necessary keys, account numbers, and email addresses for data dispatch.

## API Integration List
1. E*Trade
2. TD Ameritrade - [API Info](https://developer.tdameritrade.com/apis)
3. Interactive Brokers
4. Merrill Edge
5. Wells Direct
6. Robinhood
7. Vanguard
8. Fidelity Investments
9. Tasty Trades

## Project Requirements

### Timeline
- **Deadline**: Complete deliverable by 27-4-2024

### Deliverables
- Source code
- Configuration files
- Compilation and execution instructions for Windows 10
- A review session via Skype or screen share (max 2 hours)

## Project Components
1. **E*Trade API Integration**
2. **Text-to-Voice Conversion**
3. **Emailing System**
4. **API Data Manipulation Education**

### Skeleton Project Details
- **Functionality**: 
  - Download data via APIs.
  - Convert text updates to voice.
  - Send the voice file via email.
- **Data Handling**: The system may need to capture initial snapshots of portfolio data to track daily changes effectively.

### Detailed Updates to be Communicated
- Total portfolio value and daily change.
- Top three gainers and losers of the day.

## Full Project Expansion (Post-Skeleton)
After establishing the skeleton, the project will expand to include detailed financial data handling and reporting, as outlined below:

1. **Summary**: Initial briefing of portfolio status and daily market results.
2. **Stocks/ETFs/MFs/Bonds**: Detailed analysis and reporting of specific asset types.
3. **Options**: Overview of options held, categorized by type and potential financial impact.
4. **Dividends**: Forecast and tracking of dividend income.
5. **Cash Management**: Reporting on uninvested cash and potential financial strategies.
6. **Account Types**: Breakdown between retirement and non-retirement account holdings and strategies.
7. **Gains/Losses**: Detailed reporting on short-term and long-term gains and losses.
8. **Trading Activity**: Detailed monthly trading report.

## Phase 2
- Further integration with other APIs and continuation of feature development.
