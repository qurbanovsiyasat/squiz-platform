import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MathRenderer from './MathRenderer'
import { sanitizeLaTeX, isLatexSafe } from '@/utils/mathSecurity'
import { Eye, EyeOff, Calculator, FunctionSquare, Sigma, MoreHorizontal, AlertTriangle } from 'lucide-react'

interface MathInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
}

// Comprehensive math symbols and functions organized by category
const MATH_CATEGORIES = {
  basic: [
    { symbol: '\\frac{}{}', display: 'a/b', description: 'Fraction' },
    { symbol: '^{}', display: 'x²', description: 'Power/Superscript' },
    { symbol: '_{}', display: 'x₁', description: 'Subscript' },
    { symbol: '\\sqrt{}', display: '√', description: 'Square root' },
    { symbol: '\\sqrt[n]{}', display: 'ⁿ√', description: 'nth root' },
    { symbol: '\\pm', display: '±', description: 'Plus minus' },
    { symbol: '\\mp', display: '∓', description: 'Minus plus' },
    { symbol: '\\cdot', display: '·', description: 'Multiplication dot' },
  ],
  advanced: [
    { symbol: '\\sum_{}^{}', display: '∑', description: 'Sum' },
    { symbol: '\\prod_{}^{}', display: '∏', description: 'Product' },
    { symbol: '\\int_{}^{}', display: '∫', description: 'Integral' },
    { symbol: '\\oint', display: '∮', description: 'Contour integral' },
    { symbol: '\\iint', display: '∬', description: 'Double integral' },
    { symbol: '\\iiint', display: '∭', description: 'Triple integral' },
    { symbol: '\\partial', display: '∂', description: 'Partial derivative' },
    { symbol: '\\nabla', display: '∇', description: 'Nabla/gradient' },
  ],
  limits: [
    { symbol: '\\lim_{}', display: 'lim', description: 'Limit' },
    { symbol: '\\lim_{x \\to \\infty}', display: 'lim→∞', description: 'Limit to infinity' },
    { symbol: '\\lim_{x \\to 0}', display: 'lim→0', description: 'Limit to zero' },
    { symbol: '\\limsup', display: 'lim sup', description: 'Limit superior' },
    { symbol: '\\liminf', display: 'lim inf', description: 'Limit inferior' },
  ],
  functions: [
    { symbol: '\\sin', display: 'sin', description: 'Sine' },
    { symbol: '\\cos', display: 'cos', description: 'Cosine' },
    { symbol: '\\tan', display: 'tan', description: 'Tangent' },
    { symbol: '\\cot', display: 'cot', description: 'Cotangent' },
    { symbol: '\\sec', display: 'sec', description: 'Secant' },
    { symbol: '\\csc', display: 'csc', description: 'Cosecant' },
    { symbol: '\\arcsin', display: 'arcsin', description: 'Arcsine' },
    { symbol: '\\arccos', display: 'arccos', description: 'Arccosine' },
    { symbol: '\\arctan', display: 'arctan', description: 'Arctangent' },
    { symbol: '\\sinh', display: 'sinh', description: 'Hyperbolic sine' },
    { symbol: '\\cosh', display: 'cosh', description: 'Hyperbolic cosine' },
    { symbol: '\\tanh', display: 'tanh', description: 'Hyperbolic tangent' },
    { symbol: '\\log', display: 'log', description: 'Logarithm' },
    { symbol: '\\ln', display: 'ln', description: 'Natural logarithm' },
    { symbol: '\\log_{}', display: 'log₂', description: 'Logarithm base n' },
    { symbol: '\\exp', display: 'exp', description: 'Exponential' },
  ],
  greek: [
    { symbol: '\\alpha', display: 'α', description: 'Alpha' },
    { symbol: '\\beta', display: 'β', description: 'Beta' },
    { symbol: '\\gamma', display: 'γ', description: 'Gamma' },
    { symbol: '\\delta', display: 'δ', description: 'Delta' },
    { symbol: '\\epsilon', display: 'ε', description: 'Epsilon' },
    { symbol: '\\theta', display: 'θ', description: 'Theta' },
    { symbol: '\\lambda', display: 'λ', description: 'Lambda' },
    { symbol: '\\mu', display: 'μ', description: 'Mu' },
    { symbol: '\\pi', display: 'π', description: 'Pi' },
    { symbol: '\\sigma', display: 'σ', description: 'Sigma' },
    { symbol: '\\phi', display: 'φ', description: 'Phi' },
    { symbol: '\\omega', display: 'ω', description: 'Omega' },
    { symbol: '\\Gamma', display: 'Γ', description: 'Capital Gamma' },
    { symbol: '\\Delta', display: 'Δ', description: 'Capital Delta' },
    { symbol: '\\Theta', display: 'Θ', description: 'Capital Theta' },
    { symbol: '\\Lambda', display: 'Λ', description: 'Capital Lambda' },
    { symbol: '\\Sigma', display: 'Σ', description: 'Capital Sigma' },
    { symbol: '\\Phi', display: 'Φ', description: 'Capital Phi' },
    { symbol: '\\Omega', display: 'Ω', description: 'Capital Omega' },
  ],
  relations: [
    { symbol: '=', display: '=', description: 'Equal' },
    { symbol: '\\neq', display: '≠', description: 'Not equal' },
    { symbol: '\\approx', display: '≈', description: 'Approximately equal' },
    { symbol: '\\equiv', display: '≡', description: 'Equivalent' },
    { symbol: '<', display: '<', description: 'Less than' },
    { symbol: '>', display: '>', description: 'Greater than' },
    { symbol: '\\leq', display: '≤', description: 'Less than or equal' },
    { symbol: '\\geq', display: '≥', description: 'Greater than or equal' },
    { symbol: '\\ll', display: '≪', description: 'Much less than' },
    { symbol: '\\gg', display: '≫', description: 'Much greater than' },
    { symbol: '\\propto', display: '∝', description: 'Proportional to' },
    { symbol: '\\sim', display: '∼', description: 'Similar to' },
    { symbol: '\\cong', display: '≅', description: 'Congruent' },
  ],
  sets: [
    { symbol: '\\in', display: '∈', description: 'Element of' },
    { symbol: '\\notin', display: '∉', description: 'Not element of' },
    { symbol: '\\subset', display: '⊂', description: 'Subset' },
    { symbol: '\\supset', display: '⊃', description: 'Superset' },
    { symbol: '\\subseteq', display: '⊆', description: 'Subset or equal' },
    { symbol: '\\supseteq', display: '⊇', description: 'Superset or equal' },
    { symbol: '\\cup', display: '∪', description: 'Union' },
    { symbol: '\\cap', display: '∩', description: 'Intersection' },
    { symbol: '\\emptyset', display: '∅', description: 'Empty set' },
    { symbol: '\\infty', display: '∞', description: 'Infinity' },
    { symbol: '\\forall', display: '∀', description: 'For all' },
    { symbol: '\\exists', display: '∃', description: 'There exists' },
  ],
  arrows: [
    { symbol: '\\rightarrow', display: '→', description: 'Right arrow' },
    { symbol: '\\leftarrow', display: '←', description: 'Left arrow' },
    { symbol: '\\leftrightarrow', display: '↔', description: 'Left right arrow' },
    { symbol: '\\Rightarrow', display: '⇒', description: 'Implies' },
    { symbol: '\\Leftarrow', display: '⇐', description: 'Implied by' },
    { symbol: '\\Leftrightarrow', display: '⇔', description: 'If and only if' },
    { symbol: '\\uparrow', display: '↑', description: 'Up arrow' },
    { symbol: '\\downarrow', display: '↓', description: 'Down arrow' },
  ]
}

export default function MathInput({ 
  value, 
  onChange, 
  placeholder = 'Enter math expression using LaTeX syntax...', 
  label,
  disabled = false,
  className = ''
}: MathInputProps) {
  const [showPreview, setShowPreview] = useState(true)
  const [showSymbols, setShowSymbols] = useState(false)
  const [activeCategory, setActiveCategory] = useState('basic')
  const [securityWarning, setSecurityWarning] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Ensure onChange is called properly with security validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    
    // Check for security issues
    if (!isLatexSafe(newValue)) {
      setSecurityWarning('Potentially unsafe content detected. Some commands may be removed.')
    } else {
      setSecurityWarning('')
    }
    
    // Sanitize the input before passing to onChange
    const sanitizedValue = sanitizeLaTeX(newValue)
    onChange(sanitizedValue)
  }

  const insertSymbol = (symbol: string) => {
    if (!inputRef.current) return
    
    const input = inputRef.current
    const start = input.selectionStart || 0
    const end = input.selectionEnd || 0
    
    const newValue = value.slice(0, start) + symbol + value.slice(end)
    onChange(newValue)
    
    // Set cursor position after inserted symbol
    setTimeout(() => {
      const newPos = start + symbol.length
      input.setSelectionRange(newPos, newPos)
      input.focus()
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle enhanced shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'f':
          e.preventDefault()
          insertSymbol('\\frac{}{}')
          break
        case 'r':
          e.preventDefault()
          insertSymbol('\\sqrt{}')
          break
        case 's':
          e.preventDefault()
          insertSymbol('\\sum_{}^{}')
          break
        case 'i':
          e.preventDefault()
          insertSymbol('\\int_{}^{}')
          break
        case 'l':
          e.preventDefault()
          insertSymbol('\\lim_{}')
          break
        case 'p':
          e.preventDefault()
          insertSymbol('\\pi')
          break
      }
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSymbols(!showSymbols)}
              disabled={disabled}
            >
              Math Symbols
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              disabled={disabled}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Preview
            </Button>
          </div>
        </div>
      )}
      
      {/* Enhanced Symbol Palette with Categories */}
      {showSymbols && (
        <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-4">
              <TabsTrigger value="basic" className="text-xs">
                <Calculator className="h-3 w-3 mr-1" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs">
                <Sigma className="h-3 w-3 mr-1" />
                Advanced
              </TabsTrigger>
              <TabsTrigger value="limits" className="text-xs">
                <FunctionSquare className="h-3 w-3 mr-1" />
                Limits
              </TabsTrigger>
              <TabsTrigger value="functions" className="text-xs">
                <span className="mr-1">fn</span>
                Functions
              </TabsTrigger>
              <TabsTrigger value="greek" className="text-xs">
                <span className="mr-1">α</span>
                Greek
              </TabsTrigger>
              <TabsTrigger value="relations" className="text-xs">
                <span className="mr-1">=</span>
                Relations
              </TabsTrigger>
              <TabsTrigger value="sets" className="text-xs">
                <span className="mr-1">∈</span>
                Sets
              </TabsTrigger>
              <TabsTrigger value="arrows" className="text-xs">
                <span className="mr-1">→</span>
                Arrows
              </TabsTrigger>
            </TabsList>
            
            {Object.entries(MATH_CATEGORIES).map(([category, symbols]) => (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {symbols.map((item, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 text-sm hover:bg-purple-50 hover:border-purple-300 transition-colors"
                      onClick={() => insertSymbol(item.symbol)}
                      disabled={disabled}
                      title={item.description}
                    >
                      <span className="font-mono">{item.display}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-xs text-blue-800 dark:text-blue-200 font-medium mb-1">
              Quick shortcuts:
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-300 grid grid-cols-1 sm:grid-cols-2 gap-1">
              <span>• Ctrl+F = Fraction</span>
              <span>• Ctrl+R = Square root</span>
              <span>• Ctrl+S = Sum</span>
              <span>• Ctrl+I = Integral</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Input Field */}
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`font-mono ${className}`}
      />
      
      {/* Preview */}
      {showPreview && value && (
        <div className="border rounded-lg p-3 bg-white dark:bg-slate-900">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Preview:</div>
          <div className="text-lg">
            <MathRenderer>{value}</MathRenderer>
          </div>
        </div>
      )}
      
      {/* Enhanced Help Text */}
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <div><strong>Examples:</strong></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <span>• Fraction: {`\\frac{1}{2}`}</span>
          <span>• Power: {`x^{2}`}</span>
          <span>• Root: {`\\sqrt{x}`}</span>
          <span>• Sum: {`\\sum_{i=1}^{n}`}</span>
          <span>• Integral: {`\\int_{0}^{1}`}</span>
          <span>• Logarithm: {`\\log(x)`}</span>
        </div>
      </div>
    </div>
  )
}
