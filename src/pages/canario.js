// @ts-check

import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

import styles from './canario.module.css';

const DOWNLOAD_URL =
  'https://github.com/canarioterm/releases/releases/latest/download/Canario.dmg';

function Hero() {
  return (
    <header className={styles.hero}>
      <h1 className={styles.title}>
        Canario<span className={styles.betaPill}>beta</span>
      </h1>
      <p className={styles.subtitle}>
        The terminal that thinks like a browser. Spaces, splits, a command bar,
        live tab previews and a summonable quick terminal, for macOS.
      </p>
      <p className={styles.spinoff}>
        Canario is a <Link to="/">Rio</Link> spin-off: a more modern take on the
        terminal, built on the same engine (librio). Same VT handling, same
        rendering core, same colors, wrapped in a browser-grade workflow.
      </p>
      <div className={styles.actions}>
        <Link className={styles.actionButton} href={DOWNLOAD_URL}>
          Download for macOS
        </Link>
        <Link
          className={styles.actionButtonSecondary}
          href="https://github.com/canarioterm/releases/releases"
        >
          All releases →
        </Link>
      </div>
      <p className={styles.finePrint}>
        beta · macOS 14+ · Apple silicon · free
      </p>
    </header>
  );
}

function Feature({ title, keys, image, video, pair, code, alt, children }) {
  return (
    <div className={styles.feature}>
      <div className={styles.featureCopy}>
        <h2>{title}</h2>
        <p>{children}</p>
        {keys && (
          <div className={styles.keycaps}>
            {keys.map((key) => (
              <span key={key} className={styles.key}>
                {key}
              </span>
            ))}
          </div>
        )}
      </div>
      {code ? (
        <div className={`${styles.shot} ${styles.codeShot}`}>
          <pre>
            {code.map((line) => (
              <div key={line.text} className={styles.codeLine}>
                <span className={styles.codePrompt}>$ </span>
                <span>{line.text.split(line.link)[0]}</span>
                <span className={styles.codeLink}>{line.link}</span>
              </div>
            ))}
          </pre>
        </div>
      ) : pair ? (
        <div className={styles.shotPair}>
          {pair.map((item) => (
            <div key={item.src} className={styles.shot}>
              <img src={item.src} alt={item.alt} loading="lazy" />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.shot}>
          {video ? (
            <video src={video} autoPlay loop muted playsInline />
          ) : (
            <img src={image} alt={alt} loading="lazy" />
          )}
        </div>
      )}
    </div>
  );
}

function Cell({ glyph, glyphClass, title, children }) {
  return (
    <div className={styles.cell}>
      <h3>
        <span className={`${styles.glyph} ${glyphClass}`}>{glyph}</span>
        {title}
      </h3>
      <p>{children}</p>
    </div>
  );
}

export default function Canario() {
  return (
    <Layout
      title="Canario"
      description="Canario is a Rio spin-off for macOS: spaces, splits, a command bar, live tab previews and a summonable quick terminal, built on Rio's terminal engine."
    >
      <main>
        <Hero />

        <div className={styles.marquee}>
          <div className={styles.shot}>
            <img
              src="/assets/canario/quick-terminal.png"
              alt="Canario with its salmon sidebar of spaces and the floating quick terminal summoned over it"
            />
          </div>
        </div>

        <section className={styles.features}>
          <Feature
            title="See a tab before you switch to it"
            keys={['hover']}
            image="/assets/canario/tab-preview.png"
            alt="Hovering a tab in the sidebar shows a live preview of that terminal"
          >
            Hover any tab or pane in the sidebar and a live preview appears.
            Watch the build finish, check on the agent, confirm the prompt is
            back, all without leaving what you're doing.
          </Feature>

          <Feature
            title="Splits that keep up with real work"
            keys={['⌘ D', '⇧ ⌘ D']}
            image="/assets/canario/splits.png"
            alt="Three panes split in one Canario tab: Claude Code, Codex and htop"
          >
            Columns and rows, resizable by feel. Run your agent, your editor and
            htop side by side. Each pane keeps its own working directory and
            comes back after a restart, scrollback included.
          </Feature>

          <Feature
            title="⌘K for everything"
            keys={['⌘ K']}
            image="/assets/canario/command-palette.png"
            alt="Canario's dark command palette listing terminals and actions"
          >
            One input finds any terminal or pane by title, or runs a command:
            split, new tab, quick terminal, font size. Fuzzy-matched, keyboard
            first, tinted with your space's color.
          </Feature>

          <Feature
            title="Copy text out of any image"
            keys={['click']}
            image="/assets/canario/image-peek.png"
            alt="A kitty image opened in Canario's Image Peek with Live Text highlighting the selectable text inside it"
          >
            Images print in the terminal with the kitty graphics protocol, and
            clicking one opens it in a lightbox where Live Text runs on the
            pixels: select the text in a chart or a screenshot, copy it, scan
            the QR code a CLI just printed.
          </Feature>

          <Feature
            title="Drag an image anywhere"
            keys={['drag']}
            video="/assets/canario/drag-image.webm"
            alt="Dragging an image from the terminal into a chat"
          >
            Any image in the terminal drags out as a real PNG: drop the chart
            into Slack, the screenshot into Figma, the diff into a chat with
            your agent. Right-click for copy, save and share.
          </Feature>

          <Feature
            title="Progress follows you out"
            keys={['OSC 9;4']}
            pair={[
              {
                src: '/assets/canario/progress-tab.png',
                alt: "A sidebar tab with a spinner showing a command's progress",
              },
              {
                src: '/assets/canario/progress-dock.png',
                alt: "Canario's Dock icon badged with 80% while a command runs",
              },
            ]}
          >
            Long commands report progress with the OSC 9;4 sequence, and Canario
            carries it beyond the window: a spinner on the tab, a live
            percentage on the Dock icon, and a menu bar pill that jumps you back
            to the terminal when you click it.
          </Feature>

          <Feature
            title="Your agent knows how to reach you"
            keys={['automatic']}
            pair={[
              {
                src: '/assets/canario/agent-tab.png',
                alt: 'A sidebar tab with an orange dot and a Waiting title, badged with the number of agents waiting',
              },
              {
                src: '/assets/canario/agent-menubar.png',
                alt: "A needs-you pill in the macOS menu bar next to Canario's icon",
              },
              {
                src: '/assets/canario/agent-dock.png',
                alt: "Canario's Dock icon badged with a red 1 while an agent waits for input",
              },
            ]}
          >
            Kick off Claude Code, Codex or any agent and go do something else.
            The moment it finishes a task or stops to ask you something, the
            tab badges with a waiting count, the menu bar says needs you, and
            the Dock keeps score. One click on any of them drops you back at
            the right terminal.
          </Feature>

          <Feature
            title="A URL scheme for your shell"
            keys={['canario://']}
            code={[
              { text: 'open "canario://quick"', link: 'canario://quick' },
              {
                text: 'open "canario://new?space=Work&cwd=~/api"',
                link: 'canario://new?space=Work&cwd=~/api',
              },
              {
                text: 'open "canario://terminal?title=htop"',
                link: 'canario://terminal?title=htop',
              },
              {
                text: 'open "canario://run?cmd=cargo+test"',
                link: 'canario://run?cmd=cargo+test',
              },
            ]}
          >
            Deep links, like the launchers have. Raycast, Shortcuts, other apps
            and plain hyperlinks can summon the quick terminal, open a space,
            jump to a session or run a command. Commands always confirm before
            they execute, with the exact command shown.
          </Feature>

          <Feature
            title="Breakpoints for your output"
            keys={['select', 'right click']}
            pair={[
              {
                src: '/assets/canario/watchers-menu.png',
                alt: 'Selected text in terminal output with a context menu offering Watch for "the characters below"',
              },
              {
                src: '/assets/canario/watchers-badge.png',
                alt: 'A sidebar tab with an eye badge showing a watcher is armed',
              },
            ]}
          >
            Select any text and watch for it. When it next appears in the
            output, the tab badges with a hit count and the Dock asks for
            attention. Tail the log, walk away, and know the moment the error
            shows up.
          </Feature>

          <Feature
            title="Picture in picture, for panes"
            keys={['right click']}
            image="/assets/canario/pip.png"
            alt="A pane popped out into a small always-on-top panel while its tile shows an In Picture in Picture placeholder"
          >
            Pop a running pane out into a small always-on-top panel, the way
            videos pop out of a browser. Watch the deploy from any app; close
            the panel and the pane slides back into its tab.
          </Feature>

          <Feature
            title="Every classic theme, previewed live"
            keys={['⇧ ⌘ T']}
            image="/assets/canario/theme-picker.png"
            alt="Canario's theme picker floating over a terminal, with live mini-terminal preview cards for Rio, Lucario, Dracula and Catppuccin"
          >
            Dracula, Catppuccin, Nord, Solarized, Tokyo Night, Lucario: every
            card a mini terminal rendered from the scheme's real colors. Arrow
            through the list and the whole app recolors as you move. Enter keeps
            it, Esc puts everything back.
          </Feature>

          <Feature
            title="Your terminal, your colors"
            keys={['⌘ ,']}
            image="/assets/canario/theming.png"
            alt="Canario themed in ultramarine beside its Appearance settings and the macOS color wheel"
          >
            Window, text, selection and borders: pick each one, or grab a whole
            preset in a click. Fonts too, with every monospace family previewed
            in itself. Everything applies live and stays put.
          </Feature>
        </section>

        <section>
          <div className={styles.gridHead}>
            <h2>Borrowed from browsers. Built for the shell.</h2>
          </div>
          <div className={styles.grid}>
            <Cell glyph="⌘1" glyphClass={styles.gEmber} title="Spaces">
              Group terminals into folders with their own color. Jump with ⌘1–9;
              the whole window tints to match where you are.
            </Cell>
            <Cell glyph="⚡︎" glyphClass={styles.gTide} title="Quick terminal">
              A floating shell over everything, summoned with ⌥⌘T from any app.
              Run the thing, click away, gone.
            </Cell>
            <Cell glyph="↻" glyphClass={styles.gInk} title="Session restore">
              Quit and relaunch into the same tree: folders, splits, scrollback,
              and every pane's working directory.
            </Cell>
            <Cell glyph="✈" glyphClass={styles.gInk} title="Auto-filing">
              Route new terminals into the right space by their working
              directory. Air traffic control for your shells.
            </Cell>
            <Cell glyph="🎨" glyphClass={styles.gIris} title="Rio's engine">
              Rendering and palette come from Rio's terminal core: the same VT
              handling, the same look, the classic themes built in.
            </Cell>
            <Cell glyph="🖼" glyphClass={styles.gDune} title="Image protocols">
              Kitty graphics, Sixel and iTerm2 images render right in the grid,
              from chafa, icat, yazi and friends.
            </Cell>
          </div>
        </section>

        <section className={styles.closer}>
          <h2>Give your shell a home.</h2>
          <div className={styles.actions}>
            <Link className={styles.actionButton} href={DOWNLOAD_URL}>
              Download for macOS
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
