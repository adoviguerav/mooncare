import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

type Props = { title: string; onClose: () => void; children: ReactNode }

/** A centred dialog over the panel. The browser's own modal: it keeps the focus inside, closes with Escape and
 * gives the focus back to the button that opened it. Also closes with its button or a click outside the card. */
export function Sheet({ title, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // A press that starts inside the card and ends outside it, such as dragging a slider, must not close the dialog
  const pressedOutside = useRef(false)

  useEffect(() => {
    const node = dialog.current
    if (node !== null && !node.open) node.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onPointerDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (pressedOutside.current && event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <div className="card sheet-card">
        <header className="sheet-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ghost ghost-small" onClick={() => dialog.current?.close()}>
            Close
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
