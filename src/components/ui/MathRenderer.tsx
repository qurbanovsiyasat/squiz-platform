import React, { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { sanitizeLaTeX, isLatexSafe } from '@/utils/mathSecurity'

interface MathRendererProps {
  latex: string
  displayMode?: boolean
  className?: string
  inline?: boolean
}

export function MathRenderer({ 
  latex, 
  displayMode = false, 
  className = '',
  inline = false 
}: MathRendererProps) {
  const elementRef = useRef<HTMLDivElement | HTMLSpanElement>(null)

  useEffect(() => {
    if (elementRef.current && latex) {
      try {
        // Sanitize LaTeX input for security
        const sanitizedLatex = sanitizeLaTeX(latex)
        
        // Only render if the input is considered safe
        if (!isLatexSafe(latex)) {
          console.warn('Potentially unsafe LaTeX input detected, using sanitized version')
        }
        
        katex.render(sanitizedLatex, elementRef.current, {
          displayMode: displayMode && !inline,
          throwOnError: false,
          strict: false,
          trust: false // Security: disable trusted commands
        })
      } catch (error) {
        // Fallback to showing raw latex if rendering fails
        if (elementRef.current) {
          elementRef.current.textContent = latex
        }
      }
    }
  }, [latex, displayMode, inline])

  // If no latex content, return nothing
  if (!latex) return null

  const Component = inline ? 'span' : 'div'
  
  return (
    <Component 
      ref={elementRef as any}
      className={`${className} ${inline ? 'inline-math' : 'block-math'}`}
    />
  )
}

// Utility function to detect if text contains LaTeX
export function containsLatex(text: string): boolean {
  // Simple heuristic to detect LaTeX content
  return text.includes('\\') || 
         text.includes('^') || 
         text.includes('_') ||
         text.includes('{') ||
         text.includes('}')
}

// Component that renders mixed text and math content
interface MixedContentRendererProps {
  content: string
  className?: string
}

export function MixedContentRenderer({ content, className = '' }: MixedContentRendererProps) {
  // Split content by LaTeX delimiters and render accordingly
  const renderMixedContent = (text: string) => {
    // Split by $...$ for inline math and $$...$$ for display math
    const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Display math
        const latex = part.slice(2, -2)
        return <MathRenderer key={index} latex={latex} displayMode={true} />
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline math
        const latex = part.slice(1, -1)
        return <MathRenderer key={index} latex={latex} inline={true} />
      } else {
        // Regular text
        return <span key={index}>{part}</span>
      }
    })
  }

  return (
    <div className={className}>
      {renderMixedContent(content)}
    </div>
  )
}

export default MathRenderer
