import { compilerOptions } from './tsconfig.paths.json';
import { pathsToModuleNameMapper } from 'ts-jest'

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  setupFiles: ['<rootDir>/jest.setup.ts'],
  clearMocks: true
};