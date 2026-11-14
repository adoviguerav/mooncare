import { Icon } from '../../components/Icon.tsx'
import { getLearnNote, PARAMETER_NAMES } from '../../lib/learn.ts'

type Props = { indicatorId: string; name: string; onOpenIndicator: (indicatorId: string) => void }

// The study notes of a parameter, folded until someone wants to read them. A parameter with no notes shows nothing.
export function LearnMore({ indicatorId, name, onOpenIndicator }: Props) {
  const note = getLearnNote(indicatorId)
  if (note === undefined) return null
  const { drawing } = note.body

  return (
    <details className="card group learn">
      <summary className="card-heading">
        <h2>Learn more about {name}</h2>
        <span className="group-chevron">
          <Icon name="back" size={18} />
        </span>
      </summary>
      <div className="learn-notes">
        <section className="learn-body">
          <div>
            <h3>What it does in the body</h3>
            <p>{note.body.text}</p>
          </div>
          <figure className="learn-figure">
            <img src={drawing.src} alt={drawing.alt} width={240} height={160} />
            <figcaption>{drawing.caption}</figcaption>
          </figure>
        </section>

        <section>
          <h3>What moves it</h3>
          <div className="learn-moves">
            <MoveList title="Goes up with" items={note.raises} />
            <MoveList title="Goes down with" items={note.lowers} />
          </div>
        </section>

        {note.inSpace !== undefined && (
          <section>
            <h3>In space</h3>
            <p>{note.inSpace}</p>
          </section>
        )}

        <section>
          <h3>Read it together with</h3>
          <div className="learn-links">
            {note.readWith.map((otherId) => (
              <button key={otherId} className="ghost" onClick={() => onOpenIndicator(otherId)}>
                {PARAMETER_NAMES[otherId] ?? otherId}
              </button>
            ))}
          </div>
        </section>

        <section className="learn-sources">
          <h3>Sources</h3>
          <ul>
            {note.sources.map((source) => (
              <li key={source.url}>
                <a className="source-link" href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </details>
  )
}

function MoveList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
