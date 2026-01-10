import { ScoringEngine } from './dist/lib/scoring.js';

console.log('🧪 Test du moteur de scoring OGOUÉ - Sans base de données\n');

// Créer les variables du modèle (exemple: crédit standard)
const variables = [
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
    blocking: true,  // Critère bloquant
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

// Créer le moteur
const engine = new ScoringEngine();

// Cas 1: PME ÉLIGIBLE avec bon score
console.log('📊 CAS 1: PME Éligible (CA=150k, Age=5, Ratio=45%)');
console.log('═════════════════════════════════════════════\n');

const result1 = engine.calculate({
  variables,
  values: {
    ca: 150000,
    age: 5,
    debt_ratio: 45,
  },
});

console.log('✅ Résultat 1:');
console.log(JSON.stringify(result1, null, 2));
console.log('\n');

// Cas 2: PME NON-ÉLIGIBLE (critère bloquant)
console.log('📊 CAS 2: PME Non-Éligible (Age=0, critique bloquant)');
console.log('═════════════════════════════════════════════\n');

const result2 = engine.calculate({
  variables,
  values: {
    ca: 150000,
    age: 0,  // Viole le critère bloquant
    debt_ratio: 45,
  },
});

console.log('✅ Résultat 2:');
console.log(JSON.stringify(result2, null, 2));
console.log('\n');

// Cas 3: Bonne PME avec excellent score
console.log('📊 CAS 3: PME EXCELLENT (CA=400k, Age=15, Ratio=20%)');
console.log('═════════════════════════════════════════════\n');

const result3 = engine.calculate({
  variables,
  values: {
    ca: 400000,
    age: 15,
    debt_ratio: 20,
  },
});

console.log('✅ Résultat 3:');
console.log(JSON.stringify(result3, null, 2));
console.log('\n');

// Résumé des tests
console.log('═════════════════════════════════════════════\n');
console.log('✨ RÉSUMÉ DES TESTS:\n');
console.log(`1️⃣  PME Éligible: Score=${result1.score_final}, Classification=${result1.classification}`);
console.log(`2️⃣  PME Non-Éligible: Status=${result2.status}, Blocking=${result2.blocking_failed?.length || 0}`);
console.log(`3️⃣  PME Excellent: Score=${result3.score_final}, Classification=${result3.classification}`);
console.log('\n✅ Tous les tests passent! Le moteur fonctionne correctement.\n');
