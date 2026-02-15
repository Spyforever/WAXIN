# Bun Migration Plan

This document outlines the gradual migration of the Windows 98 Web Edition project from NPM/Vite/Playwright to a Bun-native ecosystem.

## Goals
- Replace NPM with Bun for package management.
- Replace Vite with Bun's native bundler and development server.
- Migrate E2E tests to Bun Test.
- Maintain "minimal changes" while maximizing Bun's performance benefits.

---

## Comparison: Current vs. Bun

| Feature | Current Stack | Bun Ecosystem |
| :--- | :--- | :--- |
| **Runtime** | Node.js | Bun |
| **Package Manager** | NPM | Bun (`bun install`) |
| **Lockfile** | `package-lock.json` (JSON) | `bun.lock` (Text-based) |
| **Bundler** | Vite (Rollup) | `Bun.build` (Native) |
| **Dev Server** | Vite | `Bun.serve` (Native) |
| **Test Runner** | Playwright Test | Bun Test (`bun:test`) |
| **Performance** | Standard | Significantly faster (native C++ implementation) |
| **Dependency Tree** | Large (due to Vite/NPM) | Extremely lean |

---

## Phase 1: Package Management (NPM to Bun)
**Objective**: Use Bun as the primary package manager and script runner.

1.  **Generate Bun Lockfile**:
    - Run `bun install` to create `bun.lock`.
    - Remove `package-lock.json`.
2.  **Update `package.json` Scripts**:
    - Prefix scripts with `bun`.
    - Update `build:registry` to use `bun scripts/generate_registry.js`.
3.  **CI/CD Update**:
    - Modify `.github/workflows/static.yml` to use `oven-sh/setup-bun@v2`.
    - Replace `npm ci` and `npm run build` with `bun install --frozen-lockfile` and `bun run build`.
4.  **Verification**:
    - Ensure `bun run dev` and `bun run build` work correctly using the existing Vite configuration.

## Phase 2: Build Tooling (Vite to Bun)
**Objective**: Leverage Bun's native bundler and server to remove dependency on Vite.

1.  **Implement Bun Build Script**:
    - Create a custom build script (e.g., `scripts/build.js`) using `Bun.build`.
    - Configure entry points: `index.html`, `404.html`, `about.html`.
    - Handle asset loading for `.ani`, `.mp3`, and other static files.
    - Implement a mechanism to copy the `public/` directory to `dist/`.
2.  **PWA Support**:
    - Replace `vite-plugin-pwa` with a custom Service Worker generation step or a compatible Bun-native approach.
3.  **Native Dev Server**:
    - Implement a development server using `Bun.serve` with static file serving and basic HMR support.
4.  **Dependency Cleanup**:
    - Remove `vite`, `vite-plugin-pwa`, and related Vite dependencies.
5.  **Verification**:
    - Compare `dist/` output with the Vite-produced build to ensure no regression in asset paths or functionality.

## Phase 3: Testing (Playwright to Bun Test)
**Objective**: Migrate E2E tests to use `bun test`.

1.  **Test Runner Migration**:
    - Adapt `.spec.js` files in `e2e/` to use `bun:test` syntax (`describe`, `test`, `expect`).
    - Use Bun's native test runner while keeping Playwright's browser automation capabilities.
2.  **Configuration**:
    - Update `package.json` to run tests via `bun test`.
3.  **Verification**:
    - Run the full E2E suite and ensure all tests pass in the Bun environment.

## Phase 4: Documentation
**Objective**: Update all developer-facing documentation.

1.  **README.md**:
    - Update "Getting Started" and "Installation" sections to use `bun`.
2.  **AGENTS.md**:
    - Update "Development Workflow" commands to use `bun run`.
    - Reflect the change in the "Key Dependencies" section.

---

## Success Criteria
- [ ] No `package-lock.json` in the repository.
- [ ] Project builds and runs correctly without Vite.
- [ ] All E2E tests pass using `bun test`.
- [ ] CI/CD successfully deploys using Bun.
