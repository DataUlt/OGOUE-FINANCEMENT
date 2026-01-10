/**
 * OGOUÉ Scoring Engine
 * Moteur de scoring pour les produits de crédit
 * 
 * Règles de calcul:
 * 1. Validation des poids (Σ weight = 100 ± 0.1%)
 * 2. Normalisation par variable (0-100) selon direction favorable
 * 3. Bornage (clamp) et gestion des cas limites
 * 4. Critères bloquants avec statut NON_ELIGIBLE
 * 5. Pondération et score final
 */

export interface Variable {
  id: string;
  name: string;
  weight: number;
  min: number;
  max: number;
  favorableDirection: 'CROISSANT' | 'DECROISSANT';
  blocking?: boolean;
}

export interface ScoringInput {
  variables: Variable[];
  values: Record<string, number | string | null>;
  missingPolicy?: 'REFUSE' | 'PENALIZE';
}

export interface VariableDetail {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  favorableDirection: 'CROISSANT' | 'DECROISSANT';
  weight: number;
  score_variable: number;
  score_pondere: number;
}

export interface BlockingFailed {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  message: string;
}

export interface ScoringResult {
  score_final: number;
  status: 'ELIGIBLE' | 'NON_ELIGIBLE' | 'CONFIG_ERROR';
  classification: 'RISQUE' | 'MOYEN' | 'BON' | 'EXCELLENT';
  blocking_failed: BlockingFailed[];
  details: VariableDetail[];
  weight_sum: number;
  error?: string;
}

export class ScoringEngine {
  /**
   * Valide la somme des poids
   * Tolérance: 99.9 à 100.1%
   */
  private validateWeights(variables: Variable[]): { valid: boolean; sum: number; error?: string } {
    const sum = variables.reduce((acc, v) => acc + v.weight, 0);
    const tolerance = 0.1;
    const isValid = Math.abs(sum - 100) <= tolerance;

    return {
      valid: isValid,
      sum,
      error: !isValid ? `La somme des poids est ${sum.toFixed(2)}% (doit être 100 ± 0.1%)` : undefined,
    };
  }

  /**
   * Valide la configuration des variables
   */
  private validateVariableConfig(variable: Variable): { valid: boolean; error?: string } {
    if (variable.max === variable.min) {
      return {
        valid: false,
        error: `Variable "${variable.name}": min et max sont identiques (${variable.min}). Division par zéro impossible.`,
      };
    }

    if (variable.min > variable.max) {
      return {
        valid: false,
        error: `Variable "${variable.name}": min (${variable.min}) > max (${variable.max}).`,
      };
    }

    if (!['CROISSANT', 'DECROISSANT'].includes(variable.favorableDirection)) {
      return {
        valid: false,
        error: `Variable "${variable.name}": favorableDirection invalide.`,
      };
    }

    return { valid: true };
  }

  /**
   * Normalise une valeur selon la direction favorable
   * Résultat entre 0 et 100
   */
  private normalizeVariable(
    value: number,
    min: number,
    max: number,
    direction: 'CROISSANT' | 'DECROISSANT'
  ): number {
    // Clamp la valeur
    const clampedValue = Math.max(min, Math.min(max, value));

    // Calcul selon la direction
    let score: number;
    if (direction === 'CROISSANT') {
      score = ((clampedValue - min) / (max - min)) * 100;
    } else {
      // DECROISSANT
      score = ((max - clampedValue) / (max - min)) * 100;
    }

    // Arrondir à 2 décimales
    return Math.round(score * 100) / 100;
  }

  /**
   * Classifie le score final
   */
  private classifyScore(score: number): 'RISQUE' | 'MOYEN' | 'BON' | 'EXCELLENT' {
    if (score < 40) return 'RISQUE';
    if (score < 60) return 'MOYEN';
    if (score < 80) return 'BON';
    return 'EXCELLENT';
  }

  /**
   * Exécute le scoring complet
   */
  public calculate(input: ScoringInput): ScoringResult {
    const { variables, values, missingPolicy = 'REFUSE' } = input;

    // 1. Validation des poids
    const weightsValidation = this.validateWeights(variables);
    if (!weightsValidation.valid) {
      return {
        score_final: 0,
        status: 'CONFIG_ERROR',
        classification: 'RISQUE',
        blocking_failed: [],
        details: [],
        weight_sum: weightsValidation.sum,
        error: weightsValidation.error,
      };
    }

    // 2. Validation de la configuration de chaque variable
    for (const variable of variables) {
      const validation = this.validateVariableConfig(variable);
      if (!validation.valid) {
        return {
          score_final: 0,
          status: 'CONFIG_ERROR',
          classification: 'RISQUE',
          blocking_failed: [],
          details: [],
          weight_sum: weightsValidation.sum,
          error: validation.error,
        };
      }
    }

    // 3. Vérifier les valeurs manquantes
    const missingVariables = variables.filter((v) => values[v.id] === null || values[v.id] === undefined);
    if (missingVariables.length > 0 && missingPolicy === 'REFUSE') {
      return {
        score_final: 0,
        status: 'CONFIG_ERROR',
        classification: 'RISQUE',
        blocking_failed: [],
        details: [],
        weight_sum: weightsValidation.sum,
        error: `Valeurs manquantes pour: ${missingVariables.map((v) => v.name).join(', ')}`,
      };
    }

    // 4. Calculer les scores des variables et détecter les critères bloquants
    const details: VariableDetail[] = [];
    const blockingFailed: BlockingFailed[] = [];
    let totalPonderScore = 0;

    for (const variable of variables) {
      const rawValue = values[variable.id];

      // Gérer les valeurs manquantes avec PENALIZE
      let value: number;
      if (rawValue === null || rawValue === undefined) {
        if (missingPolicy === 'PENALIZE') {
          value = variable.min; // Pénaliser avec la valeur minimum
        } else {
          continue;
        }
      } else {
        value = typeof rawValue === 'string' ? parseFloat(rawValue) : rawValue;

        if (isNaN(value)) {
          return {
            score_final: 0,
            status: 'CONFIG_ERROR',
            classification: 'RISQUE',
            blocking_failed: [],
            details: [],
            weight_sum: weightsValidation.sum,
            error: `Valeur invalide pour "${variable.name}": ${rawValue}`,
          };
        }
      }

      // Calculer le score normalisé de la variable
      const score_variable = this.normalizeVariable(value, variable.min, variable.max, variable.favorableDirection);

      // Calculer le score pondéré
      const score_pondere = score_variable * (variable.weight / 100);
      totalPonderScore += score_pondere;

      // Détails de la variable
      details.push({
        id: variable.id,
        name: variable.name,
        value,
        min: variable.min,
        max: variable.max,
        favorableDirection: variable.favorableDirection,
        weight: variable.weight,
        score_variable,
        score_pondere,
      });

      // Vérifier les critères bloquants
      if (variable.blocking && (value < variable.min || value > variable.max)) {
        blockingFailed.push({
          id: variable.id,
          name: variable.name,
          value,
          min: variable.min,
          max: variable.max,
          message: value < variable.min 
            ? `"${variable.name}" est inférieur au minimum (${value} < ${variable.min})`
            : `"${variable.name}" dépasse le maximum (${value} > ${variable.max})`,
        });
      }
    }

    // 5. Déterminer le statut et le score final
    let status: 'ELIGIBLE' | 'NON_ELIGIBLE' = 'ELIGIBLE';
    let score_final = totalPonderScore;

    if (blockingFailed.length > 0) {
      status = 'NON_ELIGIBLE';
      score_final = 0;
    }

    // Bornage final
    score_final = Math.max(0, Math.min(100, score_final));
    score_final = Math.round(score_final * 100) / 100;

    // Classification
    const classification = this.classifyScore(score_final);

    return {
      score_final,
      status,
      classification,
      blocking_failed: blockingFailed,
      details,
      weight_sum: weightsValidation.sum,
    };
  }
}

