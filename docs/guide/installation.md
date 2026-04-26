# Installation & Development

Get StellarSplit running locally to explore the future of cross-chain group expenses.

## Prerequisites

- **Node.js**: v18 or later.
- **Stellar Wallet**: (e.g., Freighter) for Soroban interactions.
- **Gemini API Key**: For the AI Assistant.

## Local Setup

1.  **Clone the Repository**

    ```bash
    git clone https://github.com/SuleymanEmirGergin/Birik.git
    cd stellar-split
    ```

2.  **Install Dependencies**

    ```bash
    npm install
    ```

3.  **Environment Variables**
    Create a `.env` file in the root:

    ```env
    VITE_GEMINI_API_KEY=your_gemini_api_key
    VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

## Documentation Server

To view this documentation site locally:

```bash
npm run docs:dev
```
