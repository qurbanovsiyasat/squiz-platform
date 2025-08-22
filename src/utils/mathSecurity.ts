/**
 * Math Expression Security Utilities
 * 
 * This module provides security functions for handling LaTeX math expressions
 * to prevent XSS attacks and ensure safe rendering.
 */

// List of potentially dangerous LaTeX commands that should be blocked
const DANGEROUS_COMMANDS = [
  'input', 'include', 'write', 'read', 'openin', 'openout', 'catcode',
  'def', 'edef', 'gdef', 'xdef', 'let', 'futurelet', 'countdef',
  'dimendef', 'skipdef', 'muskipdef', 'toksdef', 'newcommand',
  'renewcommand', 'providecommand', 'newenvironment', 'renewenvironment',
  'immediate', 'special', 'pdfobj', 'pdfliteral', 'pdfannot',
  'href', 'url', 'hyperlink', 'hypertarget'
]

// List of allowed LaTeX commands for mathematical expressions
const ALLOWED_COMMANDS = [
  // Basic math
  'frac', 'dfrac', 'tfrac', 'sqrt', 'root', 'over', 'above', 'atop',
  
  // Superscripts and subscripts
  'sup', 'sub',
  
  // Greek letters
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta',
  'theta', 'vartheta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi',
  'varpi', 'rho', 'varrho', 'sigma', 'varsigma', 'tau', 'upsilon', 'phi',
  'varphi', 'chi', 'psi', 'omega', 'Gamma', 'Delta', 'Theta', 'Lambda',
  'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
  
  // Mathematical functions
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'coth', 'exp', 'ln', 'log', 'lg', 'det', 'dim',
  'gcd', 'hom', 'ker', 'arg', 'deg', 'max', 'min', 'sup', 'inf', 'lim',
  'limsup', 'liminf', 'Pr',
  
  // Integrals and sums
  'sum', 'prod', 'coprod', 'int', 'iint', 'iiint', 'oint', 'oiint',
  'bigcup', 'bigcap', 'bigsqcup', 'bigvee', 'bigwedge', 'bigodot',
  'bigoplus', 'bigotimes', 'biguplus',
  
  // Relations
  'eq', 'neq', 'equiv', 'not', 'approx', 'cong', 'simeq', 'sim', 'propto',
  'le', 'ge', 'leq', 'geq', 'll', 'gg', 'subset', 'supset', 'subseteq',
  'supseteq', 'in', 'ni', 'notin', 'owns', 'perp', 'parallel', 'mid',
  'nmid', 'vdash', 'dashv', 'models', 'prec', 'succ', 'preceq', 'succeq',
  
  // Operations
  'pm', 'mp', 'times', 'div', 'ast', 'star', 'circ', 'bullet', 'cdot',
  'cap', 'cup', 'uplus', 'sqcap', 'sqcup', 'vee', 'wedge', 'setminus',
  'wr', 'diamond', 'bigtriangleup', 'bigtriangledown', 'triangleleft',
  'triangleright', 'oplus', 'ominus', 'otimes', 'oslash', 'odot',
  
  // Arrows
  'leftarrow', 'rightarrow', 'leftrightarrow', 'Leftarrow', 'Rightarrow',
  'Leftrightarrow', 'uparrow', 'downarrow', 'updownarrow', 'Uparrow',
  'Downarrow', 'Updownarrow', 'mapsto', 'longmapsto', 'hookleftarrow',
  'hookrightarrow', 'leftharpoonup', 'leftharpoondown', 'rightharpoonup',
  'rightharpoondown', 'rightleftharpoons', 'iff', 'implies',
  
  // Delimiters
  'left', 'right', 'big', 'Big', 'bigg', 'Bigg', 'langle', 'rangle',
  'lceil', 'rceil', 'lfloor', 'rfloor', 'vert', 'Vert',
  
  // Spacing and formatting
  'quad', 'qquad', 'thinspace', 'medspace', 'thickspace', 'negspace',
  'negthinspace', 'negmedspace', 'negthickspace', 'phantom', 'hphantom',
  'vphantom', 'smash', 'mathstrut', 'text', 'textrm', 'textit', 'textbf',
  'textsf', 'texttt', 'mathrm', 'mathit', 'mathbf', 'mathsf', 'mathtt',
  'mathcal', 'mathscr', 'mathfrak', 'mathbb', 'boldsymbol',
  
  // Accents
  'hat', 'check', 'tilde', 'acute', 'grave', 'dot', 'ddot', 'breve',
  'bar', 'vec', 'widehat', 'widetilde', 'overline', 'underline',
  'overbrace', 'underbrace', 'overrightarrow', 'overleftarrow',
  
  // Matrices and arrays
  'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix',
  'array', 'cases', 'aligned', 'alignedat', 'split', 'gather', 'gathered',
  
  // Miscellaneous
  'ldots', 'cdots', 'vdots', 'ddots', 'dots', 'infty', 'partial', 'nabla',
  'hbar', 'ell', 'Re', 'Im', 'wp', 'emptyset', 'varnothing', 'top', 'bot',
  'angle', 'forall', 'exists', 'nexists', 'therefore', 'because', 'QED',
  'blacksquare', 'square', 'triangle', 'Diamond', 'Club', 'Heart', 'Spade'
]

/**
 * Sanitizes LaTeX input to prevent XSS attacks and dangerous commands
 * @param latex The LaTeX string to sanitize
 * @returns Sanitized LaTeX string
 */
export function sanitizeLaTeX(latex: string): string {
  if (!latex || typeof latex !== 'string') {
    return ''
  }

  // Remove any HTML tags
  let sanitized = latex.replace(/<[^>]*>/g, '')
  
  // Remove script tags and javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')
  
  // Check for dangerous commands
  for (const command of DANGEROUS_COMMANDS) {
    const regex = new RegExp(`\\\\${command}\\b`, 'gi')
    if (regex.test(sanitized)) {
      console.warn(`Dangerous LaTeX command detected and removed: \\${command}`)
      sanitized = sanitized.replace(regex, '')
    }
  }
  
  // Remove any remaining backslashes followed by non-mathematical commands
  // This is a more restrictive approach - only allow known safe commands
  const commandRegex = /\\([a-zA-Z]+)/g
  sanitized = sanitized.replace(commandRegex, (match, command) => {
    if (ALLOWED_COMMANDS.includes(command.toLowerCase())) {
      return match // Keep the command if it's allowed
    } else {
      console.warn(`Unknown/disallowed LaTeX command removed: \\${command}`)
      return '' // Remove unknown commands
    }
  })
  
  // Limit the overall length to prevent DoS
  const MAX_LENGTH = 10000
  if (sanitized.length > MAX_LENGTH) {
    console.warn(`LaTeX input truncated due to length (${sanitized.length} > ${MAX_LENGTH})`)
    sanitized = sanitized.substring(0, MAX_LENGTH)
  }
  
  return sanitized
}

/**
 * Validates if a LaTeX string is safe for rendering
 * @param latex The LaTeX string to validate
 * @returns true if safe, false otherwise
 */
export function isLatexSafe(latex: string): boolean {
  if (!latex || typeof latex !== 'string') {
    return true
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /\\input\b/i,
    /\\include\b/i,
    /\\write\b/i,
    /\\def\b/i,
    /\\newcommand\b/i,
    /\\href\b/i,
    /\\url\b/i
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(latex)) {
      return false
    }
  }

  return true
}

/**
 * Extracts plain text content from LaTeX, removing all commands
 * @param latex The LaTeX string
 * @returns Plain text content
 */
export function extractPlainText(latex: string): string {
  if (!latex || typeof latex !== 'string') {
    return ''
  }

  let text = latex
  
  // Remove LaTeX commands but keep their content where appropriate
  text = text.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
  text = text.replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
  text = text.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
  text = text.replace(/\\[a-zA-Z]+/g, '')
  
  // Remove braces and other LaTeX syntax
  text = text.replace(/[{}]/g, '')
  text = text.replace(/\$+/g, '')
  text = text.replace(/\\\(/g, '').replace(/\\\)/g, '')
  text = text.replace(/\\\[/g, '').replace(/\\\]/g, '')
  
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim()
  
  return text
}

/**
 * Escapes special characters in LaTeX for safe storage
 * @param latex The LaTeX string to escape
 * @returns Escaped LaTeX string
 */
export function escapeLaTeX(latex: string): string {
  if (!latex || typeof latex !== 'string') {
    return ''
  }

  // Escape backslashes first, then other special characters
  return latex
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\$/g, '\\$')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\textasciitilde{}')
}

/**
 * Configuration for math input security
 */
export const MATH_SECURITY_CONFIG = {
  maxLength: 10000,
  allowedCommands: ALLOWED_COMMANDS,
  dangerousCommands: DANGEROUS_COMMANDS,
  enableStrictMode: true, // Only allow explicitly whitelisted commands
  logWarnings: true // Log security warnings to console
}
