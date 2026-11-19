# QVM Mobile

QVM Mobile is a static browser-based x86 emulator using **v86**. It can boot BIOS-compatible ISO and raw IMG media directly in a modern browser, and it can be hosted by GitHub Pages or another static CDN.

> v86 emulates a legacy x86 PC. It is not QEMU running natively or in WebAssembly as the original request, and it does not provide complete hardware, UEFI, GPU, or networking compatibility.

## Run locally

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080`. A plain static server is sufficient; no Node server, upload API, or native QEMU installation is required.

## GitHub Pages

Because the project is dependency-free, deploy the repository root directly with a static Pages workflow. Pin the v86 CDN package version instead of `@latest` before a real release.

Current v86 assets needed by the page:

- `libv86.js`
- `v86.wasm`
- `bios/seabios.bin`
- `bios/vgabios.bin`

The page loads those assets from jsDelivr in this draft. `libv86.js` and the BIOS can instead be copied into the repository or a pinned CDN path.

## Loading images

- **Local upload:** select an ISO or raw IMG. It is read with `File.arrayBuffer()` and stays in browser memory. The browser never uploads it.
- **Remote URL:** enter a cross-origin URL. The CDN or host must allow browser CORS. Range support may improve large-disk loading.
- **CDN-hosted disk:** serve the image with HTTPS and range support. Avoid embedding a URL that redirects or denies CORS.
- **IMG:** attached as a hard disk.
- **ISO:** attached as a CD-ROM.

v86 primarily boots BIOS-based x86 guests. Windows 9x/NT-era, DOS, and many small Linux distributions are more likely to work than current UEFI-only distributions. Real x86 OS compatibility is limited; ARM, macOS, and modern mobile OS images are not supported as normal guests.

### Memory and mobile limitations

The page offers 64–512 MiB guest RAM. Mobile browsers may terminate a tab with large allocations or full ISO buffers. Keep the guest small and test on a desktop browser first. Browser workers, hardware acceleration, Safari behavior, and WebAssembly threading vary by device.

## Security

Never enter secrets into an emulator guest. A remote image URL can be a tracking or malicious resource. v86 has no network relay in this configuration. Use only trusted OS images and pinned dependencies.
