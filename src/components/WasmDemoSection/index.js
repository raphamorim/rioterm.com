// @ts-check

import Translate from '@docusaurus/Translate';
import RiotermDemo from '@site/src/components/RiotermDemo';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

/**
 * Full-bleed band right under the hero: the Rio VT core running in the
 * reader's browser via riotermjs. The heading sits beside the demo's
 * controls, the terminal spans edge to edge below, so it is the second
 * thing people see, before the download cards.
 */
export default function WasmDemoSection() {
  return (
    <section className={styles.section}>
      <RiotermDemo
        className={styles.demo}
        header={
          <div className={styles.intro}>
            <span className={styles.eyebrow}>
              <Translate>live · in your browser</Translate>
            </span>
            <Heading as="h2" className={styles.title}>
              <Translate>Try Rio without installing anything</Translate>
            </Heading>
            <p className={styles.subtitle}>
              <Translate>
                The same terminal core that ships in the desktop app, compiled
                to WebAssembly and booting Linux in this tab. Click in and type.
              </Translate>
            </p>
          </div>
        }
      />
      <p className={styles.footnote}>
        <Translate>Want it on your desktop with GPU rendering?</Translate>{' '}
        <a href="#download">
          <Translate>Jump to downloads ↓</Translate>
        </a>
      </p>
    </section>
  );
}
