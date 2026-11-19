const fileInput = document.querySelector('#vm-image');
const urlInput = document.querySelector('#image-url');
const kindSelect = document.querySelector('#image-kind');
const memorySelect = document.querySelector('#memory-size');
const form = document.querySelector('#vm-form');
const startButton = document.querySelector('#vm-start');
const stopButton = document.querySelector('#vm-stop');
const resetButton = document.querySelector('#vm-reset');
const cadButton = document.querySelector('#send-cad');
const mouseButton = document.querySelector('#toggle-mouse');
const canvas = document.querySelector('#vm-screen');
const placeholder = document.querySelector('#vm-placeholder');
const runtimeStatus = document.querySelector('#runtime-status');
const message = document.querySelector('#vm-message');
const engineError = document.querySelector('#engine-error');
const serialOutput = document.querySelector('#serial-output');
const serialForm = document.querySelector('#serial-form');
const serialInput = document.querySelector('#serial-input');

let emulator = null;
let mouseCaptured = false;

function say(text, error = false) {
  message.textContent = text;
  message.classList.toggle('vm-error', error);
}
function setRunning(running) {
  startButton.disabled = running;
  stopButton.disabled = !running;
  resetButton.disabled = !running;
  cadButton.disabled = !running;
  mouseButton.disabled = !running;
  document.querySelector('#status').textContent = running ? 'VM RUNNING' : 'READY';
}
function stopVm() {
  if (emulator) {
    emulator.stop();
    emulator.destroy();
    emulator = null;
  }
  placeholder.textContent = 'Choose an image to boot';
  placeholder.classList.remove('hidden');
  canvas.classList.remove('visible');
  mouseCaptured = false;
  mouseButton.textContent = 'Capture mouse';
  setRunning(false);
}

if (typeof window.V86Starter !== 'function') {
  runtimeStatus.textContent = 'Runtime unavailable';
  engineError.textContent = 'Could not load v86 from the CDN. Check network and Content Security Policy settings.';
  engineError.classList.remove('hidden');
  startButton.disabled = true;
} else {
  runtimeStatus.textContent = 'Ready';
}

form.addEventListener('submit', async (event) => {
  event.preventEvent?.();
  event.preventDefault();
  if (typeof window.V86Starter !== 'function') return;
  if (emulator) stopVm();

  const file = fileInput.files[0];
  const url = urlInput.value.trim();
  if (!file && !url) return say('Choose an ISO/IMG file or enter an image URL.', true);

  startButton.disabled = true;
  runtimeStatus.textContent = 'Starting…';
  serialOutput.textContent = '';
  say('Starting browser-based x86 emulation…');

  try {
    let media;
    if (file) {
      media = { buffer: await file.arrayBuffer() };
    } else {
      media = { url, async: true };
    }

    const config = {
      wasm_path: 'https://cdn.jsdelivr.net/npm/v86@latest/build/v86.wasm',
      memory_size: Number(memorySelect.value),
      vga_memory_size: 8 * 1024 * 1024,
      screen_container: canvas,
      bios: { url: 'https://cdn.jsdelivr.net/npm/v86@latest/bios/seabios.bin' },
      vga_bios: { url: 'https://cdn.jsdelivr.net/npm/v86@latest/bios/vgabios.bin' },
      autostart: true,
      disable_jit: false,
      network_relay_url: false,
    };

    if (kindSelect.value === 'cdrom') config.cdrom = media;
    else config.hda = media;

    emulator = new window.V86Starter(config);
    emulator.add_listener('emulator-loaded', () => say('Emulator loaded; waiting for BIOS and boot media…'));
    emulator.add_listener('screen-set-size', () => {
      placeholder.classList.add('hidden');
      canvas.classList.add('visible');
    });
    emulator.add_listener('serial0-output-char', (character) => {
      serialOutput.textContent += character;
      serialOutput.scrollTop = serialOutput.scrollHeight;
    });

    runtimeStatus.textContent = 'Running';
    setRunning(true);
  } catch (error) {
    runtimeStatus.textContent = 'Failed';
    setRunning(false);
    say(error?.message || String(error), true);
  }
});

stopButton.addEventListener('click', () => {
  stopVm();
  say('VM stopped and released.');
  runtimeStatus.textContent = 'Ready';
});
resetButton.addEventListener('click', () => {
  if (!emulator) return;
  emulator.restart();
  say('VM reset.');
});
cadButton.addEventListener('click', () => emulator?.send_ctrl_alt_del());
mouseButton.addEventListener('click', () => {
  if (!emulator) return;
  mouseCaptured = !mouseCaptured;
  if (mouseCaptured) emulator.mouse_set_status(true); else emulator.mouse_set_status(false);
  mouseButton.textContent = mouseCaptured ? 'Release mouse' : 'Capture mouse';
});
serialForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!emulator || !serialInput.value) return;
  emulator.serial0_send(serialInput.value + '\r');
  serialInput.value = '';
});
