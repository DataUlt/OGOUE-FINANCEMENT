#!/usr/bin/env node

/**
 * Script de test de l'endpoint POST /api/simulations/calculate
 * Teste le moteur de scoring avec des données réelles
 */

const testData = {
  product_id: "product_test_001",
  values: {
    ca: 150000,
    age: 5,
    debt_ratio: 45
  }
};

console.log('🧪 Test de l\'endpoint /api/simulations/calculate\n');
console.log('📝 Données d\'entrée:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n⏳ Appel en cours...\n');

fetch('http://localhost:3001/api/simulations/calculate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ Réponse du serveur:\n');
    console.log(JSON.stringify(data, null, 2));
    
    // Vérifier les champs clés
    if (data.score_final !== undefined && data.status !== undefined && data.classification !== undefined) {
      console.log('\n✨ Test réussi! Les champs essentiels sont présents.');
      console.log(`   Score: ${data.score_final}/100`);
      console.log(`   Statut: ${data.status}`);
      console.log(`   Classification: ${data.classification}`);
    } else {
      console.log('\n⚠️ Avertissement: Champs manquants dans la réponse');
    }
  })
  .catch(err => {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  });
