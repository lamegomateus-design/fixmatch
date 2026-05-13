/**
 * Premissas de mercado parametrizáveis.
 * Todos os valores são decimais (0,10 = 10%). Centralizar aqui evita
 * espalhar magic numbers pelo engine financeiro.
 */

/** CDI anualizado corrente (decimal). */
export const CDI_ANUAL = 0.144;

/** Selic anualizada (referência). */
export const SELIC_ANUAL = 0.1465;

/** IPCA projetado a.a. (usado em mock e MtM de IPCA+). */
export const IPCA_ANUAL = 0.042;

/** Base de dias úteis ANBIMA (ano comercial). */
export const DU_ANO = 252;

/** Base de dias corridos por ano. */
export const DC_ANO = 365;

/** VNA base no instante da emissão de uma NTN-B / Debênture IPCA+ (BRL). */
export const VNA_BASE = 1000;

/** Casas decimais para PU em cálculo. */
export const PU_DECIMAIS_CALCULO = 6;

/** Casas decimais para PU na UI. */
export const PU_DECIMAIS_EXIBICAO = 2;

/** Curva ativa default quando o usuário ainda não tocou o toggle. */
export const FONTE_CURVA_DEFAULT = "DI_B3" as const;
