// @ts-check

import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import clsx from 'clsx';
import styles from './styles.module.css';

const RELEASE_BASE = 'https://github.com/raphamorim/rio/releases/latest/download';

export default function DownloadSection() {
  return (
    <section className={clsx('container', styles.downloadSection)}>
      <div className={styles.platforms}>
        <div className={styles.platformCard}>
          <Heading as="h3" className={styles.platformName}>
            macOS
          </Heading>
          <p className={styles.platformDescription}>
            <Translate>
              Universal binary that works on both Apple Silicon and Intel machines.
            </Translate>
          </p>
          <div className={styles.platformActions}>
            <Link href={`${RELEASE_BASE}/rio.dmg`} className={styles.downloadButton}>
              <Translate>Download .dmg</Translate>
            </Link>
          </div>
          <code className={styles.command}>
            <span className={styles.commandPrompt}>$ </span>brew install --cask rio
          </code>
          <Link to="/docs/install/macos" className={styles.moreLink}>
            <Translate>All macOS options →</Translate>
          </Link>
        </div>

        <div className={styles.platformCard}>
          <Heading as="h3" className={styles.platformName}>
            Windows
          </Heading>
          <p className={styles.platformDescription}>
            <Translate>
              MSI installer and portable executables for Windows 10 or later.
            </Translate>
          </p>
          <div className={styles.platformActions}>
            <Link
              href={`${RELEASE_BASE}/rio-installer-x86_64.msi`}
              className={styles.downloadButton}
            >
              <Translate>Download .msi</Translate>
            </Link>
          </div>
          <code className={styles.command}>
            <span className={styles.commandPrompt}>$ </span>winget install -e --id
            raphamorim.rio
          </code>
          <Link to="/docs/install/windows" className={styles.moreLink}>
            <Translate>All Windows options →</Translate>
          </Link>
        </div>

        <div className={styles.platformCard}>
          <Heading as="h3" className={styles.platformName}>
            Linux
          </Heading>
          <p className={styles.platformDescription}>
            <Translate>
              Pre-built packages for Arch, Alpine, Nix, openSUSE, Flathub, Void and
              more — plus .deb and .rpm on GitHub releases.
            </Translate>
          </p>
          <div className={styles.platformActions}>
            <Link
              href="https://flathub.org/apps/com.rioterm.Rio"
              className={styles.downloadButton}
            >
              <Translate>Get it on Flathub</Translate>
            </Link>
            <Link
              to="/docs/install/build-from-source"
              className={styles.secondaryButton}
            >
              <Translate>Build from source</Translate>
            </Link>
          </div>
          <code className={styles.command}>
            <span className={styles.commandPrompt}>$ </span>flatpak install flathub
            com.rioterm.Rio
          </code>
          <code className={styles.command}>
            <span className={styles.commandPrompt}>$ </span>pacman -S rio
          </code>
          <code className={styles.command}>
            <span className={styles.commandPrompt}>$ </span>cargo install rioterm
            --locked
          </code>
          <Link to="/docs/install/linux" className={styles.moreLink}>
            <Translate>All Linux options →</Translate>
          </Link>
        </div>

        <div className={styles.platformCard}>
          <Heading as="h3" className={styles.platformName}>
            FreeBSD
          </Heading>
          <p className={styles.platformDescription}>
            <Translate>Available in the FreeBSD Ports collection.</Translate>
          </p>
          <div className={styles.platformActions}>
            <Link
              href="https://ports.freebsd.org/cgi/ports.cgi?query=rio-terminal&stype=all&sektion=all"
              className={styles.downloadButton}
            >
              <Translate>FreeBSD Ports</Translate>
            </Link>
          </div>
          <code className={styles.command}>
            <span className={styles.commandPrompt}>$ </span>pkg install rio-terminal
          </code>
          <Link to="/docs/install/freebsd" className={styles.moreLink}>
            <Translate>All FreeBSD options →</Translate>
          </Link>
        </div>
      </div>
    </section>
  );
}
