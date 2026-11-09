// @ts-check

import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import clsx from 'clsx';
import styles from './styles.module.css';

const DOWNLOAD_URL =
  'https://github.com/canarioterm/releases/releases/latest/download/Canario.dmg';

const HIGHLIGHTS = [
  {
    glyph: '⌘1',
    title: 'Spaces',
    text: 'Group terminals into folders with their own color and jump with ⌘1–9.',
  },
  {
    glyph: '⚡︎',
    title: 'Quick terminal',
    text: 'A floating shell over everything, summoned with ⌥⌘T from any app.',
  },
  {
    glyph: '⌘K',
    title: 'Command bar',
    text: 'Find any terminal or run any action from one fuzzy-matched input.',
  },
  {
    glyph: '↻',
    title: 'Session restore',
    text: 'Quit and relaunch into the same folders, splits and scrollback.',
  },
];

/**
 * Homepage pointer to Canario, the macOS spin-off built on librio. Copy and
 * screenshot come from the /canario page so the two stay in step.
 */
export default function CanarioSection() {
  return (
    <section className={clsx('container', styles.section)}>
      <div className={styles.copy}>
        <span className={styles.eyebrow}>
          <Translate>Rio spin-off · macOS</Translate>
        </span>
        <Heading as="h2" className={styles.title}>
          <span className={styles.wordmark}>Canario</span>
          <span className={styles.betaPill}>beta</span>
        </Heading>
        <p className={styles.pitch}>
          <Translate>
            The terminal that thinks like a browser. Spaces, splits, a command
            bar, live tab previews and a summonable quick terminal, built on the
            same engine as Rio.
          </Translate>
        </p>
        <ul className={styles.highlights}>
          {HIGHLIGHTS.map((h) => (
            <li key={h.title}>
              <span className={styles.glyph} aria-hidden="true">
                {h.glyph}
              </span>
              <div>
                <strong>{h.title}</strong>
                <span>{h.text}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <Link to="/canario" className={styles.actionButton}>
            <Translate>Meet Canario →</Translate>
          </Link>
          <Link href={DOWNLOAD_URL} className={styles.actionButtonSecondary}>
            <Translate>Download for macOS</Translate>
          </Link>
        </div>
        <p className={styles.finePrint}>
          <Translate>beta · macOS 14+ · Apple silicon · free</Translate>
        </p>
      </div>
      <div className={styles.shot}>
        <img
          src="/assets/canario/quick-terminal.png"
          width={1600}
          height={1087}
          loading="lazy"
          alt="Canario with its sidebar of spaces and the floating quick terminal summoned over it"
        />
      </div>
    </section>
  );
}
