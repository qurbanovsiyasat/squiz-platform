import React from 'react'

// Expanded lexicons and heuristics for better per-token language detection
const AZ_SPECIFIC_CHARS = /[əƏğĞıİöÖşŞüÜçÇ]/
const EN_ASCII_LETTERS = /[A-Za-z]/
const URL_REGEX = /^(https?:\/\/|www\.)/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NUMERIC_REGEX = /^[-+]?\d+[\d,.%]*$/

const AZ_COMMON_WORDS = new Set([
  'və','bir','iki','üç','bu','nə','necə','üçün','ilə','deyil','amma','bəli','xeyr','salam','təşəkkürlər','sual','cavab','şəkil','baxış','istifadə','istifadəçi','hesab','daxil','çıxış','profil','səhifə','qeydiyyat','sən','biz','onlar','mən','burada','orada','bunun','bundan','hansı','niyə','çünki','gərək','edək','edək','yazın','yüklənir','göndər','qəbul','et','sil','admin','super_admin','kateqoriya','bəhs','mövzu','rəy','mesaj','dost','like','paylaş'
])

const EN_COMMON_WORDS = new Set([
  'the','and','of','to','in','is','it','you','that','for','on','with','as','i','this','be','at','by','not','are','or','from','your','have','more','can','click','view','submit','save','send','accept','delete','admin','category','image','answer','question','page','profile','login','logout','register','share','like','comment'
])

const AZ_SUFFIXES = [
  'lar','lər','da','də','dan','dən','in','ın','un','ün','im','ım','um','üm','dir','dır','dur','dür','mış','miş','muş','müş','acaq','əcək','maq','mək','sız','siz','suz','süz','lığ','liy','luğu','liyi'
]

const EN_SUFFIXES = [
  'ing','ed','tion','sion','ness','ment','ers','ies','able','ible','ally','ize','ise','ful','less','est','er','ly','s'
]

function stripPunctuation(token: string): string {
  return token.replace(/^[\p{P}\p{S}]+/u, '').replace(/[\p{P}\p{S}]+$/u, '')
}

function detectTokenLanguage(token: string): 'az' | 'en' {
  // Fast-path: URLs, emails, numerics — keep as-is, default to 'en' for neutrality
  if (URL_REGEX.test(token) || EMAIL_REGEX.test(token) || NUMERIC_REGEX.test(token)) {
    return 'en'
  }

  const raw = token
  const core = stripPunctuation(raw)
  if (!core) return 'az'
  const lower = core.toLowerCase()

  let scoreAZ = 0
  let scoreEN = 0

  // 1) Character set cues
  if (AZ_SPECIFIC_CHARS.test(core)) scoreAZ += 4
  if (EN_ASCII_LETTERS.test(core) && !AZ_SPECIFIC_CHARS.test(core)) scoreEN += 2

  // 2) Lexicon hits (strong signal)
  if (AZ_COMMON_WORDS.has(lower)) scoreAZ += 5
  if (EN_COMMON_WORDS.has(lower)) scoreEN += 5

  // 3) Suffix morphology
  for (const suf of AZ_SUFFIXES) {
    if (lower.endsWith(suf)) { scoreAZ += 2; break }
  }
  for (const suf of EN_SUFFIXES) {
    if (lower.endsWith(suf)) { scoreEN += 2; break }
  }

  // 4) English digraphs/patterns unlikely in Azerbaijani orthography
  if (/th/.test(lower)) scoreEN += 2
  if (/wh/.test(lower)) scoreEN += 1
  if (/tion|sion/.test(lower)) scoreEN += 2

  // 5) Word shape heuristics
  const lettersOnly = lower.replace(/[^a-zA-ZəğıöşüçİƏĞİÖŞÜÇ]/g, '')
  if (lettersOnly.length >= 6 && AZ_SPECIFIC_CHARS.test(lower)) scoreAZ += 1
  if (lettersOnly.length >= 6 && /[aeiou]{2}/i.test(lower)) scoreEN += 1

  // 6) Fallback biases
  if (scoreAZ === 0 && scoreEN === 0) {
    // If contains any Latin letters but no AZ diacritics, lean English
    if (EN_ASCII_LETTERS.test(lower) && !AZ_SPECIFIC_CHARS.test(lower)) return 'en'
    return 'az'
  }

  return scoreAZ >= scoreEN ? 'az' : 'en'
}

export interface AutoLangTextProps {
  text: string
  tag?: keyof JSX.IntrinsicElements // 'p' | 'h1' | 'h2' | ...
  className?: string
}

// Renders a heading/paragraph while marking each token with appropriate lang attribute (az/en)
export default function AutoLangText({ text, tag = 'p', className }: AutoLangTextProps) {
  const Tag = tag as any

  // Split text by spaces while preserving them
  const tokens = text.split(/(\s+)/)

  return (
    <Tag className={className}>
      {tokens.map((tok, idx) => {
        // Preserve whitespace as-is
        if (/^\s+$/.test(tok) || tok === '') {
          return tok
        }
        const lang = detectTokenLanguage(tok)
        return (
          <span key={idx} lang={lang}>
            {tok}
          </span>
        )
      })}
    </Tag>
  )
}
