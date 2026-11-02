module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // Source uses NodeNext-style `.js` import suffixes; map them back to the .ts files
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        strict: true,
        jsx: 'react',
        types: ['node', 'jest'],
      },
    }],
  },
};
