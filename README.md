<div align="center">

# 💸 ExpenseIQ

**Money tracking you can just talk to.** *"Coffee at Starbucks $6.50."* *"Split dinner $80 with Alice and Bob."* *"Am I spending more than last month?"* ExpenseIQ logs it, sorts it, and tells you where your money really goes.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Plaid](https://img.shields.io/badge/Plaid-bank%20sync-111111?style=flat-square)
![Auth.js](https://img.shields.io/badge/Auth.js-OAuth%20%2B%20OTP-7C3AED?style=flat-square)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

<img src="docs/screenshots/dashboard.jpg" width="880" alt="ExpenseIQ dashboard" />

</div>

---

## Why ExpenseIQ?

Budgeting apps fail for one reason: logging is a chore. ExpenseIQ removes the friction. Type a sentence, connect your bank, or drop in a statement, and the categorizing, recurring-charge spotting and splitting happen for you.

## Features

| | |
|---|---|
| 💬 **AI chat assistant** | Log expenses and income in plain English, split bills, and ask questions about your spending. |
| 🏦 **Bank sync with Plaid** | Connect accounts and import transactions automatically. |
| 📄 **Statement import** | Upload a PDF, CSV or TXT bank statement and the transactions are parsed and imported. |
| 📊 **Analytics** | A 12-month spending trend, a category breakdown, and your five biggest transactions. |
| 🔁 **Recurring charge detection** | Finds subscriptions and repeating bills, totals the monthly and annual cost, and lets you flag ones to cancel. |
| 📈 **Running balance and net worth** | Month-by-month earned vs. spent with a running total, plus assets and liabilities in one number. |
| 👥 **Split groups** | Share expenses with friends, join a group by invite code, and see who owes whom. |
| 🧠 **AI insights** | Monthly summaries, cost-cutting tips, a playful "roast my spending", and your spending personality. |
| 🔐 **Secure sign-in** | Email and password with OTP verification, or Google, GitHub and Apple sign-in. |
| 🌙 **Dark mode** | Plus a matching **iOS app** (see [ExpenseIQ-iOS](https://github.com/roszhan2684/ExpenseIQ-iOS)). |

<p align="center">
  <img src="docs/screenshots/chat.jpg" width="49%" alt="Finance assistant chat" />
  <img src="docs/screenshots/subscriptions.jpg" width="49%" alt="Recurring charges detected" />
</p>
<p align="center">
  <img src="docs/screenshots/analytics.jpg" width="49%" alt="Spending analytics" />
  <img src="docs/screenshots/balance.jpg" width="49%" alt="Running balance" />
</p>

<sub>Screenshots use a demo account with three months of sample transactions.</sub>

## Tech

- **App:** Next.js 16 (App Router) + TypeScript + Tailwind, deployed on Vercel.
- **Data:** MongoDB with Mongoose models for users, transactions, split groups, Plaid items, net worth and settings.
- **Auth:** Auth.js (NextAuth) with credentials plus email OTP (Gmail SMTP), Google, GitHub and Apple.
- **AI:** a provider chain of local **Ollama**, then **Groq**, then **Google Gemini**, used for chat parsing, categorization and insights.
- **Banking:** the Plaid API with webhook-driven transaction sync.

## Run it locally

```sh
npm install
cp .env.example .env.local     # MONGODB_URI, NEXTAUTH_SECRET, OAuth, Plaid, AI keys
npm run dev                    # → http://localhost:3000
npx tsx scripts/create-admin.ts   # optional: create a first account
```

Only `MONGODB_URI` and `NEXTAUTH_SECRET` are required. Every other integration (OAuth, Plaid, AI, email) is optional.

## About

Built by **Roszhan Raj**, founder and full-stack developer.
