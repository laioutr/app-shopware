import type { WellKnownOptionName } from '@laioutr-core/canonical-types/entity/product-variant';

/**
 * Option names are merchant-authored free text, resolved per buyer context, so
 * the same axis arrives in whatever language that market publishes. Matching
 * only English and German left `wellKnownName` undefined everywhere else, and a
 * consumer that picks its size axis with `wellKnownName === 'size'` then finds
 * none.
 *
 * Aliases are compared after {@link normalizeOptionName}, so accents, ß and
 * casing need no separate entries — list a term once, in its natural spelling.
 *
 * Deliberately absent: Shopify's `Title` placeholder (the option name it gives a
 * product that has no real options) and generic wrappers like "Variant". They
 * name no axis, so leaving them unmatched is the correct answer rather than a
 * gap.
 */
// TODO make this configurable — a table cannot cover merchant-specific
// compounds ("Stutzengröße", "Größenauswahl"), which are common enough in real
// catalogs to matter.
const OPTION_NAME_ALIASES: Record<'color' | 'size' | 'material' | 'style' | 'type', string[]> = {
  color: [
    'color', // en (US), es
    'colour', // en (GB)
    'farbe', // de
    'kleur', // nl
    'couleur', // fr
    'colore', // it
    'cor', // pt
    'kolor', // pl
    'barva', // cs, sl
    'farba', // sk
    'boja', // hr
    'szín', // hu
    'culoare', // ro
    'цвят', // bg
    'χρώμα', // el
    'färg', // sv
    'farve', // da
    'farge', // no
    'väri', // fi
    'litur', // is
    'värv', // et
    'krāsa', // lv
    'spalva', // lt
    'renk', // tr
    '色', // ja
    'カラー', // ja
    '색상', // ko
    '컬러', // ko
    '颜色', // zh-Hans
    '顏色', // zh-Hant
  ],
  size: [
    'size', // en
    'größe', // de
    'groesse', // de, ASCII transliteration — "oe" survives diacritic folding
    'maat', // nl
    'grootte', // nl
    'taille', // fr
    'pointure', // fr, footwear
    'taglia', // it
    'misura', // it
    'talla', // es
    'tamaño', // es
    'tamanho', // pt
    'rozmiar', // pl
    'velikost', // cs, sl
    'veľkosť', // sk
    'veličina', // hr
    'méret', // hu
    'mărime', // ro
    'размер', // bg
    'μέγεθος', // el
    'storlek', // sv
    'størrelse', // da, no
    'koko', // fi
    'stærð', // is
    'suurus', // et
    'izmērs', // lv
    'dydis', // lt
    'beden', // tr
    'サイズ', // ja
    '사이즈', // ko
    '크기', // ko
    '尺寸', // zh
    '尺码', // zh-Hans
    '尺碼', // zh-Hant
  ],
  material: [
    'material', // en, de, es, pt, ro, sv, sl, and cs/sk `materiál` once folded
    'materiaal', // nl
    'matière', // fr
    'matériau', // fr
    'materiale', // it, da, no
    'materiał', // pl
    'materijal', // hr
    'anyag', // hu
    'материал', // bg
    'υλικό', // el
    'materiaali', // fi
    'efni', // is
    'materjal', // et
    'materiāls', // lv
    'medžiaga', // lt
    'malzeme', // tr
    '素材', // ja
    '材質', // ja, zh-Hant
    '소재', // ko
    '재질', // ko
    '材料', // zh
    '材质', // zh-Hans
  ],
  style: [
    'style', // en, fr
    'stil', // de, sv, da, no, hr, tr
    'stijl', // nl
    'stile', // it
    'estilo', // es, pt
    'styl', // pl, cs, and sk `štýl` once folded
    'slog', // sl
    'stílus', // hu
    'стил', // bg
    'στυλ', // el
    'tyyli', // fi
    'stíll', // is
    'stiil', // et
    'stils', // lv
    'stilius', // lt
    'スタイル', // ja
    '스타일', // ko
    '款式', // zh
  ],
  type: [
    'type', // en, nl, fr, da, no
    'typ', // de, pl, cs, sk, sv
    'tipo', // it, es, pt
    'tip', // sl, hr, tr
    'vrsta', // sl, hr
    'rodzaj', // pl
    'típus', // hu
    'тип', // bg
    'τύπος', // el
    'tyyppi', // fi
    'tegund', // is
    'tüüp', // et
    'veids', // lv
    'tipas', // lt
    'タイプ', // ja
    '種類', // ja
    '유형', // ko
    '타입', // ko
    '类型', // zh-Hans
    '類型', // zh-Hant
  ],
};

/**
 * Fold the spelling variants of one term onto a single key: case, surrounding
 * whitespace, diacritics (`färg` → `farg`, `veľkosť` → `velkost`) and `ß`
 * (`größe` → `grosse`, matching Swiss `grösse`).
 *
 * Decomposing first is what makes the mark-stripping work — `ö` is one code
 * point until NFD splits it into `o` plus a combining diaeresis.
 */
const normalizeOptionName = (name: string) => name.trim().toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '');

const OPTION_NAME_LOOKUP = new Map<string, WellKnownOptionName>(
  Object.entries(OPTION_NAME_ALIASES).flatMap(([wellKnownName, aliases]) =>
    aliases.map((alias) => [normalizeOptionName(alias), wellKnownName as WellKnownOptionName] as const)
  )
);

export const guessWellKnownName = (name: string): WellKnownOptionName | undefined => OPTION_NAME_LOOKUP.get(normalizeOptionName(name));
