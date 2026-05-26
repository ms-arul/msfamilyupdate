import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface HeaderActionsProps {
  children: React.ReactNode;
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({ children }) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find the target element after mounting
    const findTarget = () => {
      const el = document.getElementById('header-actions-portal');
      setTarget(prev => prev === el ? prev : el);
    };

    findTarget();

    // Use a mutation observer to handle dynamically mounted layout portals
    const observer = new MutationObserver(() => {
      findTarget();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener('resize', findTarget);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', findTarget);
    };
  }, []);

  if (!target) return null;
  return createPortal(children, target);
};

export default HeaderActions;
