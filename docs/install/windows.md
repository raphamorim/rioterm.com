---
title: 'Windows'
language: 'en'
---

Note: Rio is only available for Windows 10 or later.

Prebuilt binaries for Windows:

- [Download MSI installer for x86_64](https://github.com/raphamorim/rio/releases/latest/download/rio-installer-x86_64.msi)
- [Download portable zip for x86_64](https://github.com/raphamorim/rio/releases/latest/download/rio-portable-x86_64.zip)
- [Download MSI installer for aarch64](https://github.com/raphamorim/rio/releases/latest/download/rio-installer-aarch64.msi)
- [Download portable zip for aarch64](https://github.com/raphamorim/rio/releases/latest/download/rio-portable-aarch64.zip)

The portable zip holds `rio.exe` together with `conpty.dll` and `OpenConsole.exe`, a current pseudoconsole from the Windows Terminal project that the installer places next to `rio.exe` too. Extract the whole zip into one folder and run `rio.exe` from there: with the files beside it, images render and programs restore the screen when they exit; without them Rio falls back to the pseudoconsole built into Windows.

- Using WinGet package manager:

```sh
winget install -e --id raphamorim.rio
```

- [Using Chocolatey package manager](https://community.chocolatey.org/packages/rio-terminal)

```sh
choco install rio-terminal
```

- Using MINGW package manager: [packages.msys2.org/base/mingw-w64-rio](https://packages.msys2.org/base/mingw-w64-rio)
- [Using scoop](https://scoop.sh/#/apps?q=rio))

```sh
scoop bucket add extras
scoop install rio
```

There's a few things to note about the installer and the portable version:

- The browser will ask if you want to keep the file, click "Keep" to save the installer or zip on your computer.
- When opening the installer or the extracted `rio.exe`, Windows will give you a warning, click "More info" and then "Run anyway".

If you want to change the default shell to the new PowerShell platform, change the following line in your config file (see [Configuration file](/docs/config) for more information):

```toml
shell = { program = "pwsh", args = ["--login"] }
```

You may want to use a specific GPU on your system, specially if you're on a laptop configuration, this can enable hardware acceleration and improve performance of the application.
To make Windows utilize a GPU for a specific application through Windows display settings, follow the instructions:

1. Simultaneously press the Windows key and the letter "i" on your keyboard to open Windows Settings.
2. Select System.
3. Choose the Display option.
4. Click on the Graphics setting link located at the bottom of the page.
5. Select the application from the list or press the Browse button, then select the executable file for the application.
6. Click on the Options button to display the GPU selection window.
7. Choose the GPU you want to prioritize for the selected application.
8. Click on the Save button.

## Image support (Sixel, iTerm2, Kitty graphics)

Terminal image protocols need a modern Windows pseudoconsole. The ConPTY
built into most Windows builds predates Windows Terminal 1.22 and strips
or rewrites the escape sequences image protocols use, so tools like Yazi
render nothing ([#1759](https://github.com/raphamorim/rio/issues/1759),
[#729](https://github.com/raphamorim/rio/issues/729)), the screen is not
restored when a TUI exits, and the IME candidate window lands in the
corner ([#2031](https://github.com/raphamorim/rio/issues/2031)).

The MSI installer and the portable zip ship a modern pseudoconsole
beside `rio.exe`: `conpty.dll` and `OpenConsole.exe` from
the Windows Terminal project, version 1.25.261109001 (MIT, the notice is
in `LICENSE-ConPTY.txt`). Rio loads `conpty.dll` from its own directory
only, never from `PATH`, and logs `Using conpty.dll for pseudoconsole`
when it does. Without the files Rio falls back to the pseudoconsole built
into Windows.

If you installed Rio another way, such as `cargo install rioterm`, copy
these from the portable zip for your architecture into the directory that
holds `rio.exe`:

1. `conpty.dll` (matches Rio's architecture: x64 or arm64)
2. the `OpenConsole.exe` folders, `x64\` and `arm64\` in the x86_64 zip
   and `arm64\` in the aarch64 zip (keep the folders; `conpty.dll` picks
   the one that matches your machine)
3. `LICENSE-ConPTY.txt`

`conpty.dll` alone silently falls back to the in-box console host, so the
`OpenConsole.exe` folder for your machine has to be there too.

The shipped version is the stable release that fixed every report above;
Rio pins it by version and hash in
[`misc/windows/conhost/fetch.ps1`](https://github.com/raphamorim/rio/blob/main/misc/windows/conhost/fetch.ps1).
One upstream problem is still open: a cursor position report sent while a
long image upload is in flight can cut the upload short
([microsoft/terminal#19621](https://github.com/microsoft/terminal/issues/19621)),
which shows up as a missing image and stray base64 text with very large
kitty images. If you hit it, report the Rio version and the image size.
