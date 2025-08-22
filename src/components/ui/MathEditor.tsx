import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/Separator'
// ScrollArea component not available, using div with scroll
// Toggle component not available, using Button
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calculator, 
  FunctionSquare, 
  Sigma, 
  Plus, 
  Minus, 
  X, 
  Divide,
  Square,
  SquareDot,
  Pi,
  // MathInfinity, // Removed: not available in lucide-react
  Type,
  Eye,
  Code,
  Copy,
  Trash2,
  History,
  Undo2,
  Redo2
} from 'lucide-react'
import 'katex/dist/katex.min.css'
import { toast } from 'sonner'

// Import KaTeX for rendering
import katex from 'katex'

// Import security utilities
import { sanitizeLaTeX, isLatexSafe } from '@/utils/mathSecurity'

interface MathEditorProps {
  value?: string
  onChange?: (latex: string, isValid: boolean) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showPreview?: boolean
  compact?: boolean
}

// Math symbols and templates organized by category
const mathSymbols = {
  basic: [
    { symbol: '+', latex: '+', name: 'Plus' },
    { symbol: '−', latex: '-', name: 'Minus' },
    { symbol: '×', latex: '\\times', name: 'Multiply' },
    { symbol: '÷', latex: '\\div', name: 'Divide' },
    { symbol: '=', latex: '=', name: 'Equals' },
    { symbol: '≠', latex: '\\neq', name: 'Not equal' },
    { symbol: '±', latex: '\\pm', name: 'Plus minus' },
    { symbol: '∓', latex: '\\mp', name: 'Minus plus' }
  ],
  comparison: [
    { symbol: '<', latex: '<', name: 'Less than' },
    { symbol: '>', latex: '>', name: 'Greater than' },
    { symbol: '≤', latex: '\\leq', name: 'Less or equal' },
    { symbol: '≥', latex: '\\geq', name: 'Greater or equal' },
    { symbol: '≈', latex: '\\approx', name: 'Approximately' },
    { symbol: '≡', latex: '\\equiv', name: 'Equivalent' },
    { symbol: '∝', latex: '\\propto', name: 'Proportional to' },
    { symbol: '∞', latex: '\\infty', name: 'Infinity' }
  ],
  fractions: [
    { symbol: '½', latex: '\\frac{1}{2}', name: 'One half' },
    { symbol: '⅓', latex: '\\frac{1}{3}', name: 'One third' },
    { symbol: '¼', latex: '\\frac{1}{4}', name: 'One quarter' },
    { symbol: 'a/b', latex: '\\frac{a}{b}', name: 'Fraction' },
    { symbol: 'aᵇ/c', latex: '\\frac{a^b}{c}', name: 'Complex fraction' }
  ],
  powers: [
    { symbol: 'x²', latex: 'x^2', name: 'Square' },
    { symbol: 'x³', latex: 'x^3', name: 'Cube' },
    { symbol: 'xⁿ', latex: 'x^n', name: 'Power' },
    { symbol: 'eˣ', latex: 'e^x', name: 'Exponential' },
    { symbol: '2ˣ', latex: '2^x', name: 'Power of 2' },
    { symbol: '10ˣ', latex: '10^x', name: 'Power of 10' }
  ],
  roots: [
    { symbol: '√', latex: '\\sqrt{x}', name: 'Square root' },
    { symbol: '∛', latex: '\\sqrt[3]{x}', name: 'Cube root' },
    { symbol: 'ⁿ√', latex: '\\sqrt[n]{x}', name: 'Nth root' }
  ],
  greek: [
    { symbol: 'α', latex: '\\alpha', name: 'Alpha' },
    { symbol: 'β', latex: '\\beta', name: 'Beta' },
    { symbol: 'γ', latex: '\\gamma', name: 'Gamma' },
    { symbol: 'δ', latex: '\\delta', name: 'Delta' },
    { symbol: 'ε', latex: '\\epsilon', name: 'Epsilon' },
    { symbol: 'θ', latex: '\\theta', name: 'Theta' },
    { symbol: 'λ', latex: '\\lambda', name: 'Lambda' },
    { symbol: 'μ', latex: '\\mu', name: 'Mu' },
    { symbol: 'π', latex: '\\pi', name: 'Pi' },
    { symbol: 'σ', latex: '\\sigma', name: 'Sigma' },
    { symbol: 'φ', latex: '\\phi', name: 'Phi' },
    { symbol: 'ω', latex: '\\omega', name: 'Omega' }
  ],
  calculus: [
    { symbol: '∫', latex: '\\int', name: 'Integral' },
    { symbol: '∬', latex: '\\iint', name: 'Double integral' },
    { symbol: '∑', latex: '\\sum', name: 'Sum' },
    { symbol: '∏', latex: '\\prod', name: 'Product' },
    { symbol: '∂', latex: '\\partial', name: 'Partial derivative' },
    { symbol: '∇', latex: '\\nabla', name: 'Nabla' },
    { symbol: 'lim', latex: '\\lim_{x \\to 0}', name: 'Limit' },
    { symbol: 'd/dx', latex: '\\frac{d}{dx}', name: 'Derivative' }
  ],
  functions: [
    { symbol: 'sin', latex: '\\sin', name: 'Sine' },
    { symbol: 'cos', latex: '\\cos', name: 'Cosine' },
    { symbol: 'tan', latex: '\\tan', name: 'Tangent' },
    { symbol: 'log', latex: '\\log', name: 'Logarithm' },
    { symbol: 'ln', latex: '\\ln', name: 'Natural log' },
    { symbol: 'exp', latex: '\\exp', name: 'Exponential' }
  ],
  sets: [
    { symbol: '∈', latex: '\\in', name: 'Element of' },
    { symbol: '∉', latex: '\\notin', name: 'Not element of' },
    { symbol: '⊂', latex: '\\subset', name: 'Subset' },
    { symbol: '⊆', latex: '\\subseteq', name: 'Subset or equal' },
    { symbol: '∪', latex: '\\cup', name: 'Union' },
    { symbol: '∩', latex: '\\cap', name: 'Intersection' },
    { symbol: '∅', latex: '\\emptyset', name: 'Empty set' },
    { symbol: 'ℝ', latex: '\\mathbb{R}', name: 'Real numbers' },
    { symbol: 'ℕ', latex: '\\mathbb{N}', name: 'Natural numbers' },
    { symbol: 'ℤ', latex: '\\mathbb{Z}', name: 'Integers' }
  ]
}

// Templates for common mathematical structures
const mathTemplates = [
  { name: 'Matrix 2x2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { name: 'Matrix 3x3', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}' },
  { name: 'System of equations', latex: '\\begin{cases} x + y = 5 \\\\ 2x - y = 1 \\end{cases}' },
  { name: 'Quadratic formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { name: 'Binomial theorem', latex: '(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k' },
  { name: 'Definite integral', latex: '\\int_{a}^{b} f(x) \\, dx' },
  { name: 'Limit', latex: '\\lim_{x \\to \\infty} f(x)' },
  { name: 'Summation', latex: '\\sum_{i=1}^{n} a_i' }
]

export function MathEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Enter mathematical expression...', 
  className = '', 
  disabled = false,
  showPreview = true,
  compact = false 
}: MathEditorProps) {
  const [latex, setLatex] = useState(value)
  const [isValid, setIsValid] = useState(true)
  const [previewMode, setPreviewMode] = useState(false)
  const [history, setHistory] = useState<string[]>([value])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState('basic')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // Validate and render LaTeX
  const validateLatex = (latexString: string): boolean => {
    try {
      katex.renderToString(latexString, { 
        throwOnError: true,
        displayMode: false,
        strict: false
      })
      return true
    } catch (error) {
      return false
    }
  }

  // Update LaTeX and validate
  const updateLatex = (newLatex: string, addToHistory = true) => {
    // Sanitize the LaTeX input for security
    const sanitizedLatex = sanitizeLaTeX(newLatex)
    const isSafe = isLatexSafe(newLatex)
    
    if (!isSafe) {
      toast.warning('Input contains potentially unsafe content and has been sanitized.')
    }
    
    setLatex(sanitizedLatex)
    const valid = sanitizedLatex === '' || validateLatex(sanitizedLatex)
    setIsValid(valid)
    
    if (addToHistory && sanitizedLatex !== history[historyIndex]) {
      const newHistory = [...history.slice(0, historyIndex + 1), sanitizedLatex]
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
    
    onChange?.(sanitizedLatex, valid)
  }

  // Insert symbol or template at cursor position
  const insertAtCursor = (insertion: string) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = latex.substring(0, start) + insertion + latex.substring(end)
    
    updateLatex(newValue)
    
    // Set cursor position after insertion
    setTimeout(() => {
      const newPos = start + insertion.length
      textarea.setSelectionRange(newPos, newPos)
      textarea.focus()
    }, 0)
  }

  // Undo/Redo functionality
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      updateLatex(history[newIndex], false)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      updateLatex(history[newIndex], false)
    }
  }

  // Copy LaTeX to clipboard
  const copyLatex = () => {
    navigator.clipboard.writeText(latex)
    toast.success('LaTeX copied to clipboard')
  }

  // Clear editor
  const clearEditor = () => {
    updateLatex('')
    textareaRef.current?.focus()
  }

  // Render math preview
  const renderPreview = (latexString: string) => {
    if (!latexString || !validateLatex(latexString)) return null
    
    try {
      return katex.renderToString(latexString, { 
        displayMode: true,
        throwOnError: false,
        strict: false
      })
    } catch {
      return null
    }
  }

  // Update on value prop change
  useEffect(() => {
    if (value !== latex) {
      updateLatex(value, false)
    }
  }, [value])

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex space-x-2">
          <Textarea
            ref={textareaRef}
            value={latex}
            onChange={(e) => updateLatex(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`font-mono text-sm ${!isValid ? 'border-red-500' : ''}`}
            rows={2}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
            disabled={!latex || !isValid}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
        
        {previewMode && latex && isValid && (
          <Card>
            <CardContent className="pt-4">
              <div 
                className="text-center"
                dangerouslySetInnerHTML={{ __html: renderPreview(latex) || '' }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Math Expression Editor</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyLatex}
              disabled={!latex}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearEditor}
              disabled={!latex}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visual" className="flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span>Visual Editor</span>
            </TabsTrigger>
            <TabsTrigger value="latex" className="flex items-center space-x-2">
              <Code className="h-4 w-4" />
              <span>LaTeX Code</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="visual" className="space-y-4 mt-4">
            {/* Symbol Categories */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {Object.keys(mathSymbols).map((category) => (
                  <Button
                    key={category}
                    variant={activeCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveCategory(category)}
                    className="capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>
              
              {/* Symbol Grid */}
              <div className="h-32 overflow-y-auto border rounded-md p-2">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {mathSymbols[activeCategory as keyof typeof mathSymbols]?.map((symbol, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => insertAtCursor(symbol.latex)}
                      className="h-10 text-lg"
                      title={symbol.name}
                    >
                      {symbol.symbol}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Templates */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Common Templates:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mathTemplates.map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => insertAtCursor(template.latex)}
                    className="justify-start text-left h-auto py-2"
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="latex" className="mt-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Type className="h-4 w-4" />
                <span className="text-sm font-medium">LaTeX Input:</span>
                <Badge variant={isValid ? 'default' : 'destructive'}>
                  {isValid ? 'Valid' : 'Invalid'}
                </Badge>
              </div>
              <Textarea
                ref={textareaRef}
                value={latex}
                onChange={(e) => updateLatex(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={`font-mono ${!isValid ? 'border-red-500' : ''}`}
                rows={4}
              />
              {!isValid && (
                <p className="text-sm text-red-500">
                  Invalid LaTeX syntax. Please check your expression.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Preview */}
        {showPreview && latex && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Preview:</span>
            </div>
            <Card>
              <CardContent className="pt-4">
                {isValid ? (
                  <div 
                    ref={previewRef}
                    className="text-center text-lg"
                    dangerouslySetInnerHTML={{ __html: renderPreview(latex) || '' }}
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    Invalid expression - preview not available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MathEditor
