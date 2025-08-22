import React from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Heart } from 'lucide-react'

interface CreatorInfoProps {
  className?: string
}

const creators = [
  {
    name: 'Siyasət Qurbanov',
    role: 'Creative Teacher'
  },
  {
    name: 'Çingiz Kazımov',
    role: 'Creative Teacher'
  }
]

export default function CreatorInfo({ className = '' }: CreatorInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className={`bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-slate-800/50 dark:to-slate-700/50 rounded-2xl p-6 shadow-lg border border-primary-100 dark:border-slate-700 ${className}`}
    >
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="flex items-center justify-center space-x-2 mb-3"
        >
          <div className="flex items-center justify-center w-10 h-10 bg-primary-500 rounded-full">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <Heart className="w-4 h-4 text-rose-500" />
          <div className="flex items-center justify-center w-10 h-10 bg-secondary-500 rounded-full">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
        </motion.div>
        
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
            Yaradıcı Müəllimlər
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {creators.map((creator, index) => (
              <motion.div
                key={creator.name}
                initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border border-slate-100 dark:border-slate-700"
              >
                <div className="text-center">
                  <h4 className="font-bold text-base text-slate-800 dark:text-white mb-1">
                    {creator.name}
                  </h4>
                  <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                    {creator.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-3"
          >
            Təhsildə innovativ yanaşma və yaradıcı metodlarla tələbələri uğura aparan
            <br />
            <span className="font-medium text-primary-600 dark:text-primary-400">
              təcrübəli müəllimlər
            </span>
          </motion.p>
        </div>
      </div>
    </motion.div>
  )
}