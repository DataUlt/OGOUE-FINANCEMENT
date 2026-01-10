/**
 * Tests unitaires du moteur de scoring OGOUÉ
 * Couverture:
 * - Normalisation croissante
 * - Normalisation décroissante
 * - Bornage (clamp)
 * - Critères bloquants
 * - Erreur max=min
 * - Somme des poids != 100
 * - Exemple complet chiffré
 */

import { ScoringEngine, Variable, ScoringInput, ScoringResult } from './scoring.js';

class ScoringTester {
  private engine: ScoringEngine;
  private testsRun = 0;
  private testsPassed = 0;

  constructor() {
    this.engine = new ScoringEngine();
  }

  /**
   * Test helper - Compare values
   */
  private assert(condition: boolean, message: string) {
    this.testsRun++;
    if (condition) {
      this.testsPassed++;
      console.log(`  ✅ ${message}`);
    } else {
      console.error(`  ❌ ${message}`);
    }
  }

  /**
   * Test 1: Normalisation CROISSANT - Cas normal
   */
  testNormalisationCroissant() {
    console.log('\n📋 TEST 1: Normalisation CROISSANT (direction favorable = plus élevé)');

    const variables: Variable[] = [
      {
        id: 'ca',
        name: 'Chiffre d\'Affaires',
        weight: 100,
        min: 50000,
        max: 200000,
        favorableDirection: 'CROISSANT',
      },
    ];

    const result = this.engine.calculate({
      variables,
      values: { ca: 125000 },
    });

    // (125000 - 50000) / (200000 - 50000) * 100 = 75000 / 150000 * 100 = 50
    this.assert(result.score_final === 50, `Score = 50 (CA = 125000)`);
    this.assert(result.status === 'ELIGIBLE', 'Statut = ELIGIBLE');
    this.assert(result.classification === 'BON', 'Classification = BON (50-80)');
  }

  /**
   * Test 2: Normalisation DECROISSANT - Cas normal
   */
  testNormalisationDecroissant() {
    console.log('\n📋 TEST 2: Normalisation DECROISSANT (direction favorable = plus faible)');

    const variables: Variable[] = [
      {
        id: 'debt_ratio',
        name: 'Ratio d\'Endettement',
        weight: 100,
        min: 0,
        max: 100,
        favorableDirection: 'DECROISSANT',
      },
    ];

    const result = this.engine.calculate({
      variables,
      values: { debt_ratio: 30 },
    });

    // (100 - 30) / (100 - 0) * 100 = 70 / 100 * 100 = 70
    this.assert(result.score_final === 70, `Score = 70 (Ratio = 30%)`);
    this.assert(result.status === 'ELIGIBLE', 'Statut = ELIGIBLE');
    this.assert(result.classification === 'BON', 'Classification = BON');
  }

  /**
   * Test 3: Bornage - Valeur < min
   */
  testClamping() {
    console.log('\n📋 TEST 3: Bornage (Clamp) - Valeur hors limites');

    const variables: Variable[] = [
      {
        id: 'ca',
        name: 'CA',
        weight: 100,
        min: 50000,
        max: 200000,
        favorableDirection: 'CROISSANT',
      },
    ];

    // Cas: valeur < min
    const result1 = this.engine.calculate({
      variables,
      values: { ca: 10000 },
    });
    this.assert(result1.score_final === 0, 'Score = 0 si valeur < min');

    // Cas: valeur > max
    const result2 = this.engine.calculate({
      variables,
      values: { ca: 300000 },
    });
    this.assert(result2.score_final === 100, 'Score = 100 si valeur > max');

    // Cas: valeur = min
    const result3 = this.engine.calculate({
      variables,
      values: { ca: 50000 },
    });
    this.assert(result3.score_final === 0, 'Score = 0 si valeur = min');

    // Cas: valeur = max
    const result4 = this.engine.calculate({
      variables,
      values: { ca: 200000 },
    });
    this.assert(result4.score_final === 100, 'Score = 100 si valeur = max');
  }

  /**
   * Test 4: Critère bloquant - Dépassement des limites
   */
  testBlockingCriteria() {
    console.log('\n📋 TEST 4: Critères bloquants');

    const variables: Variable[] = [
      {
        id: 'age',
        name: 'Ancienneté',
        weight: 100,
        min: 2,
        max: 50,
        favorableDirection: 'CROISSANT',
        blocking: true,
      },
    ];

    // Cas: valeur < min (bloquant)
    const result1 = this.engine.calculate({
      variables,
      values: { age: 1 },
    });
    this.assert(result1.status === 'NON_ELIGIBLE', 'Statut = NON_ELIGIBLE si critère bloquant non respecté');
    this.assert(result1.score_final === 0, 'Score = 0 si NON_ELIGIBLE');
    this.assert(result1.blocking_failed.length === 1, '1 variable bloquante détectée');

    // Cas: valeur OK (pas bloquant)
    const result2 = this.engine.calculate({
      variables,
      values: { age: 5 },
    });
    this.assert(result2.status === 'ELIGIBLE', 'Statut = ELIGIBLE si critère bloquant respecté');
    this.assert(result2.blocking_failed.length === 0, '0 variable bloquante si OK');
  }

  /**
   * Test 5: Erreur - max == min
   */
  testMaxEqualsMin() {
    console.log('\n📋 TEST 5: Erreur de configuration - max == min');

    const variables: Variable[] = [
      {
        id: 'test',
        name: 'Test',
        weight: 100,
        min: 100,
        max: 100, // Erreur!
        favorableDirection: 'CROISSANT',
      },
    ];

    const result = this.engine.calculate({
      variables,
      values: { test: 100 },
    });

    this.assert(result.status === 'CONFIG_ERROR', 'Statut = CONFIG_ERROR');
    this.assert(result.error !== undefined, 'Message d\'erreur présent');
    this.assert(result.score_final === 0, 'Score = 0 en cas d\'erreur');
  }

  /**
   * Test 6: Erreur - Somme des poids != 100
   */
  testWeightSum() {
    console.log('\n📋 TEST 6: Erreur - Somme des poids != 100');

    const variables: Variable[] = [
      {
        id: 'var1',
        name: 'Variable 1',
        weight: 50,
        min: 0,
        max: 100,
        favorableDirection: 'CROISSANT',
      },
      {
        id: 'var2',
        name: 'Variable 2',
        weight: 40, // Somme = 90, pas 100!
        min: 0,
        max: 100,
        favorableDirection: 'CROISSANT',
      },
    ];

    const result = this.engine.calculate({
      variables,
      values: { var1: 50, var2: 50 },
    });

    this.assert(result.status === 'CONFIG_ERROR', 'Statut = CONFIG_ERROR si poids != 100');
    this.assert(result.error !== undefined, 'Message d\'erreur présent');
  }

  /**
   * Test 7: Valeurs manquantes (REFUSE)
   */
  testMissingValues() {
    console.log('\n📋 TEST 7: Valeurs manquantes - REFUSE');

    const variables: Variable[] = [
      {
        id: 'ca',
        name: 'CA',
        weight: 100,
        min: 0,
        max: 100,
        favorableDirection: 'CROISSANT',
      },
    ];

    const result = this.engine.calculate({
      variables,
      values: { ca: null }, // Valeur manquante
      missingPolicy: 'REFUSE',
    });

    this.assert(result.status === 'CONFIG_ERROR', 'Statut = CONFIG_ERROR si valeur manquante');
    this.assert(result.error !== undefined, 'Message d\'erreur pour valeur manquante');
  }

  /**
   * Test 8: Pondération multi-variables
   */
  testWeightedScoring() {
    console.log('\n📋 TEST 8: Pondération - Deux variables');

    const variables: Variable[] = [
      {
        id: 'ca',
        name: 'CA',
        weight: 60,
        min: 0,
        max: 100,
        favorableDirection: 'CROISSANT',
      },
      {
        id: 'age',
        name: 'Age',
        weight: 40,
        min: 0,
        max: 100,
        favorableDirection: 'CROISSANT',
      },
    ];

    const result = this.engine.calculate({
      variables,
      values: { ca: 100, age: 0 }, // CA excellent (100), Age faible (0)
    });

    // CA: score_variable = 100, score_pondere = 100 * 0.6 = 60
    // Age: score_variable = 0, score_pondere = 0 * 0.4 = 0
    // Total = 60
    this.assert(result.score_final === 60, 'Score = 60 (60% CA + 40% Age)');
    this.assert(result.classification === 'MOYEN', 'Classification = MOYEN (40-60)');
  }

  /**
   * Test 9: Exemple complet chiffré
   */
  testCompleteExample() {
    console.log('\n📋 TEST 9: Exemple complet chiffré');

    const variables: Variable[] = [
      {
        id: 'ca',
        name: 'Chiffre d\'Affaires',
        weight: 40,
        min: 50000,
        max: 500000,
        favorableDirection: 'CROISSANT',
        blocking: false,
      },
      {
        id: 'age',
        name: 'Ancienneté',
        weight: 30,
        min: 1,
        max: 20,
        favorableDirection: 'CROISSANT',
        blocking: true,
      },
      {
        id: 'debt_ratio',
        name: 'Ratio d\'Endettement',
        weight: 30,
        min: 0,
        max: 80,
        favorableDirection: 'DECROISSANT',
        blocking: false,
      },
    ];

    const result = this.engine.calculate({
      variables,
      values: {
        ca: 150000,
        age: 5,
        debt_ratio: 45,
      },
    });

    console.log('\n    Calcul détaillé:');
    result.details.forEach((d) => {
      console.log(`      ${d.name}:`);
      console.log(`        Valeur: ${d.value}, Plage: [${d.min}, ${d.max}]`);
      console.log(`        Score variable: ${d.score_variable}/100`);
      console.log(`        Score pondéré: ${d.score_pondere} (${d.weight}%)`);
    });

    this.assert(result.status === 'ELIGIBLE', 'Statut = ELIGIBLE');
    this.assert(result.score_final > 0 && result.score_final <= 100, 'Score final entre 0 et 100');
    this.assert(result.blocking_failed.length === 0, 'Pas de critères bloquants');

    console.log(`\n    ✨ Score final: ${result.score_final}/100`);
    console.log(`    📊 Classification: ${result.classification}`);
  }

  /**
   * Exécute tous les tests
   */
  runAllTests() {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  TESTS UNITAIRES - MOTEUR SCORING OGOUÉ   ║');
    console.log('╚══════════════════════════════════════════╝');

    this.testNormalisationCroissant();
    this.testNormalisationDecroissant();
    this.testClamping();
    this.testBlockingCriteria();
    this.testMaxEqualsMin();
    this.testWeightSum();
    this.testMissingValues();
    this.testWeightedScoring();
    this.testCompleteExample();

    // Résumé
    console.log('\n╔══════════════════════════════════════════╗');
    console.log(`║  RÉSULTATS: ${this.testsPassed}/${this.testsRun} tests passés`);
    console.log('╚══════════════════════════════════════════╝\n');

    return this.testsPassed === this.testsRun;
  }
}

// Exécuter les tests directement
const tester = new ScoringTester();
const success = tester.runAllTests();
process.exit(success ? 0 : 1);
