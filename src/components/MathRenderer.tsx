import React from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface MathRendererProps {
  children: string
  inline?: boolean
  className?: string
}

// Helper function to parse math content
export function parseMathContent(content: string) {
  // Split content by math delimiters
  const parts = []
  let currentIndex = 0
  
  // Look for inline math: $...$ or \(...\)
  const inlineMathRegex = /\$([^$]+)\$|\\\(([^)]+)\\\)/g
  // Look for block math: $$...$$ or \[...\]
  const blockMathRegex = /\$\$([^$]+)\$\$|\\\[([^\]]+)\\\]/g
  
  const allMatches = []
  
  // Find all inline math matches
  let match
  while ((match = inlineMathRegex.exec(content)) !== null) {
    allMatches.push({
      type: 'inline',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1] || match[2]
    })
  }
  
  // Find all block math matches
  while ((match = blockMathRegex.exec(content)) !== null) {
    allMatches.push({
      type: 'block',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1] || match[2]
    })
  }
  
  // Sort matches by position
  allMatches.sort((a, b) => a.start - b.start)
  
  // Build parts array
  currentIndex = 0
  for (const mathMatch of allMatches) {
    // Add text before math
    if (mathMatch.start > currentIndex) {
      parts.push({
        type: 'text',
        content: content.slice(currentIndex, mathMatch.start)
      })
    }
    
    // Add math
    parts.push({
      type: mathMatch.type,
      content: mathMatch.content
    })
    
    currentIndex = mathMatch.end
  }
  
  // Add remaining text
  if (currentIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(currentIndex)
    })
  }
  
  return parts
}

export default function MathRenderer({ children, inline = false, className = '' }: MathRendererProps) {
  if (!children) return null
  
  try {
    // If it's explicitly inline or block, render directly
    if (inline) {
      return (
        <span className={className}>
          <InlineMath math={children} />
        </span>
      )
    }
    
    // Check if content contains math delimiters
    if (children.includes('$') || children.includes('\\(') || children.includes('\\[')) {
      const parts = parseMathContent(children)
      
      return (
        <div className={className}>
          {parts.map((part, index) => {
            if (part.type === 'text') {
              return <span key={index}>{part.content}</span>
            } else if (part.type === 'inline') {
              return (
                <span key={index}>
                  <InlineMath math={part.content} />
                </span>
              )
            } else if (part.type === 'block') {
              return (
                <div key={index} className="my-2">
                  <BlockMath math={part.content} />
                </div>
              )
            }
            return null
          })}
        </div>
      )
    }
    
    // If no math delimiters found, treat as block math if it looks like math
    const mathLikePatterns = ['\\frac', '\\sqrt', '\\sum', '\\int', '^', '_', '\\alpha', '\\beta']
    const isMathLike = mathLikePatterns.some(pattern => children.includes(pattern))
    
    if (isMathLike) {
      return (
        <div className={className}>
          <BlockMath math={children} />
        </div>
      )
    }
    
    // Default to plain text
    return <span className={className}>{children}</span>
    
  } catch (error) {
    console.error('Math rendering error:', error)
    // Fallback to plain text if math rendering fails
    return (
      <span className={`${className} text-red-500`}>
        Math Error: {children}
        <br />
        <span style={{ fontSize: '0.9em', color: '#b91c1c' }}>
          {error instanceof Error ? error.message : String(error)}
        </span>
      </span>
    )
  }
}
