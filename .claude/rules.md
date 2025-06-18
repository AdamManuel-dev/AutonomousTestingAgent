## 1. Follow ESLint & Clean Code

- Enforce .eslintrc.json rules (Airbnb, Prettier, etc.).
- Write concise, readable, and maintainable code.
- Avoid anti-patterns (e.g., nested logic, magic strings).

## 2. TypeScript: Modern & Minimal

- Use modern TS/ES features (async/await, destructuring, arrow functions).
- Avoid unnecessary boilerplate; keep code short and clear.
- Type with interfaces/types; no any unless absolutely needed.

## 3. Documentation

- Add JSDoc for non-trivial functions/components.
- Do **not** include type annotations in JSDoc (TypeScript covers types).
- Keep inline comments minimal and meaningful.
- Comment each function, but keep comments very concise.
- Add ASCII diagrams when documenting something complicated.

## 4. Backend (AWS Lambda/Node.js)

- **Error Handling**: Use try/catch, custom errors, and structured logs (logger.error).
- **Testing**: Generate concise Jest unit tests for important logic.
- **Modern TS**: Prefer async/await over callbacks; destructure inputs.

## 5. Frontend (React/Material UI/Redux)

- **Functional Components & Hooks**: Avoid class components.
- **Testing**: Use Jest + React Testing Library for key components.
- Minimal, clear React code (avoid legacy lifecycle methods).

## 6. General Best Practices

- Code must be concise, easy to read, and easy to test.
- Always plan the next few steps before proceeding.
- Keep functions/modules small and focused.
- Use named exports (default only if absolutely justified).
- Don't over-comment trivial code; emphasize clarity and self-explanatory naming.
- No large monolithic files; split logic into logical modules.
- Do not store TODOs in the filesystem unless explicitly requested.
- Do not leave temporary comments anywhere.

## 7. Code Claude Instance Rules

- Each new instance of Code Claude must have its own isolated memory (no shared state between instances).
- Each Claude code instance must complete and test all assigned tasks before stopping or terminating.

Now wait for the next prompt