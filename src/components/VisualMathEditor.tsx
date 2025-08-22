import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MathRenderer from './MathRenderer'
import { sanitizeLaTeX, isLatexSafe } from '@/utils/mathSecurity'
import { 
  Calculator, 
  FunctionSquare, 
  Sigma, 
  Eye, 
  EyeOff, 
  Plus,
  Minus,
  X,
  Divide,
  Equal,
  MoreHorizontal,
  Superscript,
  Subscript,
  Square,
  Pi,
  // visualInfinity, // Removed: not available in lucide-react
  AlertTriangle,
  Copy,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface VisualMathEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
  showPreview?: boolean
  showToolbar?: boolean
  compact?: boolean
}

// Comprehensive math symbols organized by category
const MATH_SYMBOLS = {
  basic: [
    { symbol: '+', latex: '+', description: 'Addition' },
    { symbol: '−', latex: '-', description: 'Subtraction' },
    { symbol: '×', latex: '\\times', description: 'Multiplication' },
    { symbol: '÷', latex: '\\div', description: 'Division' },
    { symbol: '=', latex: '=', description: 'Equals' },
    { symbol: '≠', latex: '\\neq', description: 'Not equal' },
    { symbol: '±', latex: '\\pm', description: 'Plus minus' },
    { symbol: '∞', latex: '\\infty', description: 'Infinity' },
  ],
  fractions: [
    { symbol: 'a/b', latex: '\\frac{a}{b}', description: 'Fraction' },
    { symbol: 'a^b', latex: 'a^{b}', description: 'Power' },
    { symbol: 'a_b', latex: 'a_{b}', description: 'Subscript' },
    { symbol: '√', latex: '\\sqrt{x}', description: 'Square root' },
    { symbol: 'ⁿ√', latex: '\\sqrt[n]{x}', description: 'nth root' },
  ],
  calculus: [
    { symbol: '∫', latex: '\\int', description: 'Integral' },
    { symbol: '∬', latex: '\\iint', description: 'Double integral' },
    { symbol: '∑', latex: '\\sum_{i=1}^{n}', description: 'Sum' },
    { symbol: '∏', latex: '\\prod_{i=1}^{n}', description: 'Product' },
    { symbol: '∂', latex: '\\partial', description: 'Partial derivative' },
    { symbol: '∇', latex: '\\nabla', description: 'Nabla' },
    { symbol: 'lim', latex: '\\lim_{x \\to a}', description: 'Limit' },
  ],
  greek: [
    { symbol: 'α', latex: '\\alpha', description: 'Alpha' },
    { symbol: 'β', latex: '\\beta', description: 'Beta' },
    { symbol: 'γ', latex: '\\gamma', description: 'Gamma' },
    { symbol: 'δ', latex: '\\delta', description: 'Delta' },
    { symbol: 'ε', latex: '\\epsilon', description: 'Epsilon' },
    { symbol: 'θ', latex: '\\theta', description: 'Theta' },
    { symbol: 'λ', latex: '\\lambda', description: 'Lambda' },
    { symbol: 'μ', latex: '\\mu', description: 'Mu' },
    { symbol: 'π', latex: '\\pi', description: 'Pi' },
    { symbol: 'σ', latex: '\\sigma', description: 'Sigma' },
    { symbol: 'φ', latex: '\\phi', description: 'Phi' },
    { symbol: 'ω', latex: '\\omega', description: 'Omega' },
  ],
  functions: [
    { symbol: 'sin', latex: '\\sin(x)', description: 'Sine' },
    { symbol: 'cos', latex: '\\cos(x)', description: 'Cosine' },
    { symbol: 'tan', latex: '\\tan(x)', description: 'Tangent' },
    { symbol: 'log', latex: '\\log(x)', description: 'Logarithm' },
    { symbol: 'ln', latex: '\\ln(x)', description: 'Natural log' },
    { symbol: 'exp', latex: '\\exp(x)', description: 'Exponential' },
  ],
  relations: [
    { symbol: '<', latex: '<', description: 'Less than' },
    { symbol: '>', latex: '>', description: 'Greater than' },
    { symbol: '≤', latex: '\\leq', description: 'Less or equal' },
    { symbol: '≥', latex: '\\geq', description: 'Greater or equal' },
    { symbol: '≈', latex: '\\approx', description: 'Approximately' },
    { symbol: '≡', latex: '\\equiv', description: 'Equivalent' },
    { symbol: '∝', latex: '\\propto', description: 'Proportional' },
  ],
  sets: [
    { symbol: '∈', latex: '\\in', description: 'Element of' },
    { symbol: '∉', latex: '\\notin', description: 'Not element of' },
    { symbol: '⊂', latex: '\\subset', description: 'Subset' },
    { symbol: '⊃', latex: '\\supset', description: 'Superset' },
    { symbol: '∪', latex: '\\cup', description: 'Union' },
    { symbol: '∩', latex: '\\cap', description: 'Intersection' },
    { symbol: '∅', latex: '\\emptyset', description: 'Empty set' },
    { symbol: '∀', latex: '\\forall', description: 'For all' },
    { symbol: '∃', latex: '\\exists', description: 'There exists' },
  ]
}

// Quick templates for common math expressions
const TEMPLATES = [
  { name: 'Fraction', latex: '\\frac{numerator}{denominator}' },
  { name: 'Quadratic', latex: 'ax^2 + bx + c = 0' },
  { name: 'Integral', latex: '\\int_{a}^{b} f(x) dx' },
  { name: 'Sum', latex: '\\sum_{i=1}^{n} a_i' },
  { name: 'Limit', latex: '\\lim_{x \\to \\infty} f(x)' },
  { name: 'Matrix 2x2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { name: 'Square Root', latex: '\\sqrt{x}' },
  { name: 'Derivative', latex: '\\frac{d}{dx} f(x)' },
]

export default function VisualMathEditor({
  value,
  onChange,
  placeholder = 'Enter mathematical expression...',
  label,
  disabled = false,
  className = '',
  showPreview = true,
  showToolbar = true,
  compact = false
}: VisualMathEditorProps) {
  const [showSymbols, setShowSymbols] = useState(false)
  const [activeCategory, setActiveCategory] = useState('basic')
  const [showTemplates, setShowTemplates] = useState(false)
  const [securityWarning, setSecurityWarning] = useState('')
  const [localShowPreview, setLocalShowPreview] = useState(showPreview)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Security validation
  useEffect(() => {
    if (value && !isLatexSafe(value)) {
      setSecurityWarning('Potentially unsafe LaTeX content detected.')
    } else {
      setSecurityWarning('')
    }
  }, [value])
  
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const sanitizedValue = sanitizeLaTeX(newValue)
    onChange(sanitizedValue)
  }, [onChange])
  
  const insertAtCursor = useCallback((text: string) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    
    const newValue = value.slice(0, start) + text + value.slice(end)
    onChange(newValue)
    
    // Set cursor position after inserted text
    setTimeout(() => {
      const newPos = start + text.length
      textarea.setSelectionRange(newPos, newPos)
      textarea.focus()
    }, 0)
  }, [value, onChange])
  
  const insertSymbol = useCallback((latex: string) => {
    insertAtCursor(latex)
  }, [insertAtCursor])
  
  const insertTemplate = useCallback((template: string) => {
    insertAtCursor(template)
    setShowTemplates(false)
  }, [insertAtCursor])
  
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      toast.success('LaTeX copied to clipboard')
    }).catch(() => {
      toast.error('Failed to copy to clipboard')
    })
  }, [value])
  
  const clearContent = useCallback(() => {
    onChange('')
    textareaRef.current?.focus()
  }, [onChange])
  
  return (
    <div className={cn('space-y-4', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          {showToolbar && (
            <div className="flex items-center space-x-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                disabled={disabled}
                className="h-8 px-2 text-xs"
              >
                Templates
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSymbols(!showSymbols)}
                disabled={disabled}
                className="h-8 px-2 text-xs"
              >
                Symbols
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLocalShowPreview(!localShowPreview)}
                disabled={disabled}
                className="h-8 px-2 text-xs"
              >
                {localShowPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Templates Panel */}
      {showTemplates && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Templates</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {TEMPLATES.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => insertTemplate(template.latex)}
                  disabled={disabled}
                  className="h-auto p-2 text-xs justify-start"
                >
                  <div className="text-left">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {template.latex.substring(0, 20)}{template.latex.length > 20 ? '...' : ''}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Symbol Palette */}
      {showSymbols && (
        <Card>
          <CardContent className="p-4">
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-4 h-auto">
                <TabsTrigger value="basic" className="text-xs p-2">
                  <Calculator className="h-3 w-3 mr-1" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="fractions" className="text-xs p-2">
                  <Superscript className="h-3 w-3 mr-1" />
                  Powers
                </TabsTrigger>
                <TabsTrigger value="calculus" className="text-xs p-2">
                  <Sigma className="h-3 w-3 mr-1" />
                  Calculus
                </TabsTrigger>
                <TabsTrigger value="greek" className="text-xs p-2">
                  <span className="mr-1">α</span>
                  Greek
                </TabsTrigger>
                <TabsTrigger value="functions" className="text-xs p-2">
                  <FunctionSquare className="h-3 w-3 mr-1" />
                  Functions
                </TabsTrigger>
                <TabsTrigger value="relations" className="text-xs p-2">
                  <Equal className="h-3 w-3 mr-1" />
                  Relations
                </TabsTrigger>
                <TabsTrigger value="sets" className="text-xs p-2">
                  <span className="mr-1">∈</span>
                  Sets
                </TabsTrigger>
                <TabsTrigger value="more" className="text-xs p-2">
                  <MoreHorizontal className="h-3 w-3" />
                </TabsTrigger>
              </TabsList>
              
              {Object.entries(MATH_SYMBOLS).map(([category, symbols]) => (
                <TabsContent key={category} value={category} className="mt-0">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {symbols.map((item, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => insertSymbol(item.latex)}
                        disabled={disabled}
                        title={`${item.description} (${item.latex})`}
                        className="h-10 text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <span className="font-mono">{item.symbol}</span>
                      </Button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-xs text-blue-800 dark:text-blue-200 font-medium mb-1">
                Pro tip: Use keyboard shortcuts
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-300 grid grid-cols-1 sm:grid-cols-2 gap-1">
                <span>• Ctrl+/ for fractions</span>
                <span>• Ctrl+R for square roots</span>
                <span>• Ctrl+^ for powers</span>
                <span>• Ctrl+_ for subscripts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Editor */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={compact ? 3 : 6}
          className={cn(
            'font-mono text-sm resize-none',
            securityWarning && 'border-yellow-300 bg-yellow-50'
          )}
        />
        
        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex space-x-1">
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              disabled={disabled}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearContent}
              disabled={disabled}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Security Warning */}
      {securityWarning && (
        <div className="flex items-center space-x-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          <span>{securityWarning}</span>
        </div>
      )}
      
      {/* Live Preview */}
      {localShowPreview && value && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="p-4 bg-white dark:bg-slate-900 border rounded-lg">
              <MathRenderer>{value}</MathRenderer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Help Text */}
      <div className="text-xs text-slate-500 space-y-1">
        <div><strong>LaTeX Examples:</strong></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <code>\frac{1}{2}</code> → ½
          <code>x^{2}</code> → x²
          <code>\sqrt{`x`}</code> → √x
          <code>\int_{0}^{1}</code> → ∫₀¹
        </div>
      </div>
    </div>
  )
}
