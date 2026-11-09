// @ts-check

import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import { BenchmarkSuites, LatencyCurves, LatencyStrip } from '@site/src/components/Benchmarks';
import Heading from '@theme/Heading';
import clsx from 'clsx';
import styles from './styles.module.css';

export default function BenchmarksSection() {
  return (
    <section className={clsx('container', styles.benchmarksSection)}>
      <Heading as="h2" className={styles.title}>
        <Translate>Fast where it counts</Translate>
      </Heading>
      <p className={styles.subtitle}>
        <Translate>
          Throughput, latency, frame rate and memory, measured with the same suites other
          terminals publish.
        </Translate>
      </p>
      <BenchmarkSuites />
      <LatencyStrip />
      <LatencyCurves />
      <Link to="/docs/benchmarks" className={styles.moreLink}>
        <Translate>Methodology and more charts →</Translate>
      </Link>
    </section>
  );
}
