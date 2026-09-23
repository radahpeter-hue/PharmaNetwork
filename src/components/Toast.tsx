import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'success', 
  isVisible, 
  onClose,
  duration = 5000
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] min-w-[320px]"
        >
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md",
            type === 'success' ? "bg-green-50 border-green-200 text-green-800" :
            type === 'error' ? "bg-red-50 border-red-200 text-red-800" :
            "bg-amber-50 border-amber-200 text-amber-800"
          )}>
            {type === 'success' ? <CheckCircle2 size={20} className="text-green-600" /> : <AlertCircle size={20} className={type === 'error' ? "text-red-600" : "text-amber-600"} />}
            <span className="text-sm font-semibold flex-grow">{message}</span>
            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
