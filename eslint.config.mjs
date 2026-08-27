import next from 'eslint-config-next'
import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

export default [
  { ignores: ['.next/**', '.test-build/**', 'node_modules/**', 'next-env.d.ts'] },
  ...next,
  ...coreWebVitals,
  ...typescript,
]
