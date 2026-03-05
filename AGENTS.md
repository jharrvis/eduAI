# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages and layouts (`app/admin/*`, `app/student/*`, root `app/page.tsx`).
- `store/`: global state with Zustand (`store/useStore.ts`).
- `hooks/`: reusable React hooks (for example, `hooks/use-mobile.ts`).
- `lib/`: shared utility helpers (`lib/utils.ts`).
- Config files live at the root: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.env.example`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start local dev server (Next.js).
- `npm run build`: create production build.
- `npm run start`: run the production build locally.
- `npm run lint`: run ESLint across the repository.
- `npm run clean`: clear Next.js build artifacts.

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Indentation: 2 spaces; keep semicolons and double quotes consistent with existing files.
- Components/pages: PascalCase export names, file names follow Next.js routing (`page.tsx`, `layout.tsx`).
- Hooks: `useXxx` naming pattern.
- Shared helpers: place in `lib/` and keep them framework-agnostic when possible.
- Run `npm run lint` before opening a PR.

## Testing Guidelines
- There is currently no dedicated test framework configured in `package.json`.
- Minimum expectation for contributions: lint clean and manual verification of changed routes in `npm run dev`.
- When adding tests, prefer colocated `*.test.ts`/`*.test.tsx` files and document the new test command in `package.json`.

## Commit & Pull Request Guidelines
- Follow Conventional Commits, as seen in history (for example, `feat: initialize ...`).
- Suggested commit types: `feat`, `fix`, `refactor`, `chore`, `docs`.
- PRs should include:
  - short problem/solution summary,
  - linked issue (if available),
  - screenshots or screen recordings for UI changes,
  - notes about environment/config changes (for example, `.env.local` keys).

## Security & Configuration Tips
- Do not commit secrets. Use `.env.local` locally and keep `.env.example` as the template.
- Required key: `GEMINI_API_KEY`.
