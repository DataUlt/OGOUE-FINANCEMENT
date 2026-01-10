import { ScoringTester } from './dist/lib/scoring.test.js';

const tester = new ScoringTester();
const success = tester.runAllTests();
process.exit(success ? 0 : 1);
