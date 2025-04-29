import { pathsToModuleNameMapper } from 'ts-jest';

import { compilerOptions } from './tsconfig.json';

module.exports = {
    rootDir: '.',
    roots: ['<rootDir>/apps/', '<rootDir>/libs/'],
    moduleFileExtensions: ['js', 'json', 'ts'],
    testRegex: '.*\\.spec\\.ts$',
    testEnvironment: 'node',

    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },

    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),

    collectCoverage: true,
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: './coverage',
    coveragePathIgnorePatterns: ['dist', 'libs', 'coverage', 'main.ts', 'swagger.ts', 'node_modules', 'module.ts', 'interface.ts'],
    coverageReporters: ['json-summary', 'lcov'],
    /**
    coverageThreshold: {
        global: {
            lines: 90,
            statements: 90,
            functions: 90,
            branches: 90,
        },
    },
     */
};
