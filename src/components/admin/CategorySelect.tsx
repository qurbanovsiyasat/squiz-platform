import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/Label'
import { Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  type: 'quiz' | 'form' | 'qa'
  description?: string
}

interface CategorySelectProps {
  type: 'quiz' | 'form' | 'qa'
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
  required?: boolean
}

export function CategorySelect({
  type,
  value,
  onValueChange,
  placeholder,
  label,
  className = '',
  required = false
}: CategorySelectProps) {
  // Fetch categories by type using RPC function
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories', type],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_categories_by_type', {
        p_type: type
      })
      
      if (error) throw error
      return data as Category[]
    }
  })

  const getDefaultPlaceholder = () => {
    switch (type) {
      case 'form': return 'Select form category'
      case 'quiz': return 'Select quiz category'
      case 'qa': return 'Select Q&A category'
      default: return 'Select category'
    }
  }

  const getDefaultLabel = () => {
    switch (type) {
      case 'form': return 'Form Category'
      case 'quiz': return 'Quiz Category'
      case 'qa': return 'Q&A Category'
      default: return 'Category'
    }
  }

  return (
    <div className={className}>
      {label && (
        <Label className="block text-sm font-medium mb-2">
          {label || getDefaultLabel()}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder || getDefaultPlaceholder()} />
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-slate-500">Loading categories...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-red-500">
              Failed to load categories
            </div>
          ) : categories.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No categories available
            </div>
          ) : (
            <>
              <SelectItem value="__none__">Select category (optional)</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{category.name}</span>
                    {category.description && (
                      <span className="text-xs text-slate-500">{category.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

// Hook to get categories for programmatic use
export function useCategories(type: 'quiz' | 'form' | 'qa') {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_categories_by_type', {
        p_type: type
      })
      
      if (error) throw error
      return data as Category[]
    }
  })
}
