/** Joins class names, skipping falsy ones: cx('a', isOn && 'b') → "a b" or "a". */
export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ')
