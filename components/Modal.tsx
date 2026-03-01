import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string; // Optional prop for width control
  fullScreen?: boolean;
  bodyClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  fullScreen = false,
  bodyClassName = ''
}) => {
  if (!isOpen) return null;

  const panelClassName = fullScreen
    ? 'h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] rounded-2xl'
    : `max-h-[90vh] ${maxWidth}`;
  const contentClassName = `${fullScreen ? 'flex-1 min-h-0' : ''} p-6 overflow-y-auto ${bodyClassName}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white shadow-xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col ${panelClassName}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>
        <div className={contentClassName}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
