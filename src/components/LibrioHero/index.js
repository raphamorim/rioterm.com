// @ts-check

import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const RELEASE_BASE =
  'https://github.com/raphamorim/rio/releases/latest/download';

export default function LibrioHero() {
  return (
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Rio terminal engine · C ABI</p>
      <h1 className={styles.title}>librio</h1>
      <p className={styles.subtitle}>
        Embed a real terminal in your app without writing a parser. PTY, VT
        state, scrollback, selection and image protocols behind a small C API.
        You bring the renderer.
      </p>
      <div className={styles.pills}>
        <span className={styles.pill}>Swift</span>
        <span className={styles.pill}>C / C++</span>
        <span className={styles.pill}>Any FFI</span>
        <span className={styles.pill}>macOS · Linux · Windows</span>
      </div>
      <div className={styles.actions}>
        <Link
          className={styles.actionButton}
          href={`${RELEASE_BASE}/RioKit.xcframework.zip`}
        >
          Download RioKit.xcframework
        </Link>
        <Link
          className={styles.actionButtonSecondary}
          href={`${RELEASE_BASE}/librio.h`}
        >
          librio.h
        </Link>
        <Link
          className={styles.actionButtonSecondary}
          href="https://github.com/raphamorim/rio/tree/main/librio"
        >
          Source →
        </Link>
      </div>
      <p className={styles.finePrint}>
        Ships with every Rio release. Not on crates.io: Rust projects use{' '}
        <Link to="/docs/rio-vt">rio-vt</Link> directly.
      </p>
    </header>
  );
}
