// @ts-check

import Link from '@docusaurus/Link';
import Translate, { translate } from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import clsx from 'clsx';
import styles from './styles.module.css';

const PLATFORMS = [
  {
    name: 'macOS',
    command: 'brew install --cask rio',
    to: '/docs/install/macos',
  },
  {
    name: 'Windows',
    command: 'choco install rio-terminal',
    to: '/docs/install/windows',
  },
  {
    name: 'Linux',
    command: 'cargo install rioterm --locked',
    to: '/docs/install/linux',
  },
  {
    name: 'FreeBSD',
    command: 'pkg install rio-terminal',
    to: '/docs/install/freebsd',
  },
];

export default function InstallSection() {
  return (
    <section className={clsx(styles.installSection, 'container')}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionEyebrow}>
          <Translate>Install</Translate>
        </p>
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate>Up and running in seconds</Translate>
        </Heading>
      </div>
      <div className={styles.platforms}>
        {PLATFORMS.map((platform) => (
          <Link key={platform.name} to={platform.to} className={styles.platformCard}>
            <span className={styles.platformName}>{platform.name}</span>
            <code className={styles.platformCommand}>
              <span className={styles.commandPrompt}>$ </span>
              {platform.command}
            </code>
          </Link>
        ))}
      </div>
      <p className={styles.moreOptions}>
        <Link to="/docs/install">
          <Translate>All installation options →</Translate>
        </Link>
      </p>
    </section>
  );
}
