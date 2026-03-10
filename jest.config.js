/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: "jsdom",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/src/app/**/__tests__/**/*.test.tsx", "<rootDir>/src/app/**/__tests__/**/*.test.ts"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
    },
    {
      displayName: "node",
      testEnvironment: "node",
      testMatch: ["<rootDir>/src/lib/**/__tests__/**/*.test.ts"],
      transform: {
        "^.+\\.[jt]sx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx", allowJs: true } }],
      },
      transformIgnorePatterns: [
        "node_modules/(?!(@agentclientprotocol/sdk|zod)/)",
      ],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@github/copilot-sdk$": "<rootDir>/src/__mocks__/@github/copilot-sdk.ts",
      },
      setupFilesAfterEnv: [],
    },
  ],
};

module.exports = config;
