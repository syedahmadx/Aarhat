/**
 * The one place bilingual display names are resolved. Rows created through
 * the app frequently have no Urdu name (name_ur is nullable and optional in
 * every form), so Urdu mode must fall back to the English name — never render
 * null, never render an empty hole.
 *
 * Works for anything shaped { name, nameUr }: parties, fish types, shops.
 * For paired fields with other names (area/areaUr), adapt at the call site:
 * displayName({ name: p.area, nameUr: p.areaUr }, lang).
 */
export function displayName(obj, lang) {
  if (!obj) return '';
  const name = obj.name ?? '';
  const nameUr = obj.nameUr ?? '';
  return lang === 'ur' && nameUr ? nameUr : name;
}
