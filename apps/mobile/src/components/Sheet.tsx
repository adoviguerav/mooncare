import { type ReactNode, useEffect } from 'react'

/** A modal card over the page. Closes with the × button, Escape, or a tap outside the card. */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <section className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <button className="back x" type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </section>
  )
}
