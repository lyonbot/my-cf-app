const brackets = {
  '[': ']',
  '(': ')',
  '{': '}',
  '"': '"',
  '\'': '\'',
  '`': '`',
}

/**
 * Extracts a balanced fragment from a string.
 *
 * @author lyonbot - https://gist.github.com/lyonbot/fb3d9e39ce1bea54aa1cd3a17b999091/
 * @param {string} str - The input string.
 * @returns {null | { content: string, start: number, end: number }} - The balanced fragment extracted from the string.
 */
export function balancedMatch(str) {
  let start = -1;
  let idx = 0;

  // balance matching
  let stack = []
  let closing

  while (idx < str.length) {
    const char = str[idx];
    const insideTemplateString = closing === '`';
    const insideNormalString = closing === '"' || closing === '\'';

    // skip escaping characters
    if (char === '\\') {
      // skip escaped char
      idx += 2;
      continue;
    }

    // if not inside string literal, skip comments
    if (!insideTemplateString && !insideNormalString) {

      // skip line comment
      if (char === '/' && str[idx + 1] === '/') {
        idx = str.indexOf('\n', idx + 2);
        if (idx === -1) break;
        continue;
      }

      // skip block comment
      if (char === '/' && str[idx + 1] === '*') {
        idx = str.indexOf('*/', idx + 2);
        if (idx === -1) break;
        idx += 2;
        continue;
      }

      // skip regexp --------------------------------
      // [!] delete this if you don't need it
      // a dirty implementation of skipping regex literal. using new RexExp() to validate the regex literal.
      if (char === '/') {
        idx = getIdxAfterRegExp(str, idx);
        continue;
      }
      // --------------------------------
    }

    // check if entering a new wrapping, ignoring things for string literal
    let entering = char in brackets
    if (entering && insideNormalString) entering = false; // special rule: ignore unclosed brackets in string literal
    if (entering && insideTemplateString) entering = char === '{' && str[idx - 1] === '$' // for js template string interpolating ${ }

    // update stack and status
    if (entering) {
      stack.push(closing);
      closing = brackets[char];

      // find a beginning bracket
      if (start === -1) start = idx;
    } else if (char === closing) {
      closing = stack.pop();

      // if met top-level closing bracket, extract the wrapping fragment
      if (!closing) {
        return {
          content: str.slice(start, idx + 1),
          start,
          end: idx + 1,
        }
      }
    }

    idx += 1;
  }

  return null;
}



// ----------------------------------------------------------------
// addon to match and skip regexp literal 
// [!] delete this if you don't need it

/**
 * If str[idx] is a slash, try to find a regular expression literal from it.
 * Returns the index after the regular expression in the given string, or just `idx + 1` if not found
 * 
 * @param {string} str - The input string.
 * @param {number} idx - The index of the first slash of a possible regular expression
 */
function getIdxAfterRegExp(str, idx) {
  // to make things simple, we only allow these situations:

  // - /reg/.test("str")       (trailingGood) a dot exists after regexp
  // - xxx.match(/reg/)        (leadingGood), (trailingGood) parentheses exists before / after regexp
  // - [/re1/, /re2/]          (trailingGood) comma after regexp
  // - { re: /re/ }            (leadingGood) colon exists before regexp
  // - sth = /re/              (leadingGood) equal sign exists before regexp

  // first, check leading character, skipping up to 2 spaces

  let leadingGood = false;
  for (let skip = 1; skip <= 3; skip++) {
    const ch = str.charCodeAt(idx - skip);
    if (ch === 32) continue; // skip space
    if (ch === 40 || ch === 91 || ch === 58 || ch === 61) { // ( [ : =
      leadingGood = true;
    }
    break;  // stop validating on any non-space character
  }

  // then try to find the range of a regexp literal

  let endOfLine = str.indexOf('\n', idx + 1);
  if (endOfLine === -1) endOfLine = str.length;
  let lineRemainder = str.slice(idx + 1, endOfLine)

  let endOfRegex = -1
  while (endOfRegex = lineRemainder.indexOf('/', endOfRegex + 1), endOfRegex !== -1) {
    // there is another slash "/" inside this line
    // maybe it's a regex literal
    try {
      const flags = lineRemainder.slice(endOfRegex + 1).match(/^[a-z]*/)[0]
      new RegExp(lineRemainder.slice(0, endOfRegex), flags)

      // it is a regex literal!
      // convert `endOfRegex` to the index in the original string
      endOfRegex = idx + endOfRegex + 2 + flags.length // 2 for leading slash and trailing slash
      break
    } catch (err) {
      // ignoring
    }
  }

  // if we found a regex literal, check (leadingGood || trailingGood), then update idx

  if (endOfRegex !== -1) {
    // found a RegExp, now `endOfRegex` points to the character after the regex
    // validate other restriction

    if (leadingGood) {
      // leading is good, skip trailing-checking
      return endOfRegex
    } else {
      // check trailing character, skipping up to 2 spaces, just update idx

      for (let skip = 0; skip < 3; skip++) {
        const ch = str.charCodeAt(endOfRegex + skip);
        if (ch === 32) continue; // skip space
        if (ch === 41 || ch === 93 || ch === 44 || ch === 46) { // ) ] , .
          return endOfRegex + skip  // trailing is good, update idx
        }
        break;  // stop validating on any non-space character
      }
    }
  }

  // beware that `idx` must be updated (at least plus 1), otherwise we will be trapped in an infinite loop
  return idx + 1
}