export {
  CARO_INFINITE,
  CARO_RULE,
  CARO_SIZES,
  type CaroRule,
  type CaroSize,
  WIN_LENGTH,
} from "./constants";
export { CARO_DEFAULT_OPTIONS, type CaroOptions, parseCaroOptions } from "./options";
export {
  caro,
  type CaroArea,
  caroInArea,
  type CaroMove,
  type CaroState,
  caroWinningLine,
} from "./rules";
