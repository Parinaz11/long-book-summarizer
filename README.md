# Book Summarizer

This project has two separate parts:

- The React/TanStack frontend in the repository root.
- The Node.js summarization engine and local HTTP API in [`src/book-summarizer`](./src/book-summarizer).

## Run locally

1. Copy [`src/book-summarizer/.env.example`](./src/book-summarizer/.env.example) to `src/book-summarizer/.env` and set `LLM_MODEL`, `OPENROUTER_API_KEY`, and the token prices. The API can start without this file, but estimation and summarization require the pricing values and the selected provider's API key.
2. Install and start the API:

   ```sh
   cd src/book-summarizer
   npm install
   npm run server
   ```

3. In a second terminal, start the frontend from the repository root (or run `npm run dev` from `src/book-summarizer`, which delegates to the root frontend):

   ```sh
   npm install
   npm run dev
   ```

The API listens on `http://localhost:8787` and the frontend uses that address by default. Set `VITE_API_BASE_URL` if the API runs elsewhere. Set `VITE_DEMO_MODE=true` only when the bundled demo simulator is desired.

Books are read from `src/book-summarizer/data`. Completed JSON and Markdown files are written to `src/book-summarizer/output`; a book with an existing JSON output is shown as already summarized.

## Tests

```sh
npm test
cd src/book-summarizer
npm test
```

## Build with Lovable

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
