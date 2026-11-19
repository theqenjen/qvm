const sourceEl = document.querySelector('#source');
const statusEl = document.querySelector('#status');
const messageEl = document.querySelector('#message');
const outputEl = document.querySelector('#output');
const displayEl = document.querySelector('#display');
const registerEl = document.querySelector('#registers');
const memoryEl = document.querySelector('#memory');
const runButton = document.querySelector('#run');
const pauseButton = document.querySelector('#pause');
const stepButton = document.querySelector('#step');

const sampleProgram = `; Draw a row of pixels, one at a time.\nSET A, 0\nSET B, 3\nLOOP:\n  DRAW A, B, 1\n  ADD A, 1\n  CMP A, 8\n  JNZ LOOP\nHALT`;
sourceEl.value = sampleProgram;

const vm = {
  regs: { A: 0, B: 0, C: 0, D: 0 },
  memory: new Uint8Array(256), pixels: new Uint8Array(64),
  pc: 0, zero: false, program: [], labels: new Map(), input: [], running: false,
  generation: 0, steps: 0,
};

function render() {
  displayEl.replaceChildren(...Array.from(vm.pixels, (pixel) => {
    const cell = document.createElement('span');
    cell.className = pixel ? 'pixel on' : 'pixel';
    return cell;
  }));
  registerEl.replaceChildren(...Object.entries(vm.regs).map(([name, value]) => {
    const item = document.createElement('div'); item.className = 'register';
    item.innerHTML = `<span>${name}</span><strong>${value.toString(16).padStart(2, '0').toUpperCase()}</strong><small>${value}</small>`;
    return item;
  }));
  memoryEl.replaceChildren(...Array.from(vm.memory.slice(0, 16), (value, i) => {
    const cell = document.createElement('span'); cell.textContent = value.toString(16).padStart(2, '0').toUpperCase();
    cell.title = `Memory address ${i}`; return cell;
  }));
  statusEl.textContent = vm.running ? 'RUNNING' : statusEl.textContent;
}

function setStatus(text) {
  statusEl.textContent = text;
  statusEl.className = `badge ${text === 'ERROR' ? 'error' : ''}`;
  pauseButton.disabled = !vm.running;
  runButton.disabled = vm.running;
  stepButton.disabled = vm.running;
}

function say(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle('error-text', isError);
}

function log(text) {
  outputEl.textContent += `${outputEl.textContent ? '\n' : ''}${text}`;
  outputEl.scrollTop = outputEl.scrollHeight;
}

function compile(text) {
  const instructions = [];
  const labels = new Map();
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/;.*/, '').trim();
    if (!line) continue;
    const labelMatch = line.match(/^([A-Za-z_][\w]*):/);
    if (labelMatch) {
      const label = labelMatch[1].toUpperCase();
      if (labels.has(label)) throw new Error(`Line ${i + 1}: duplicate label ${label}`);
      labels.set(label, instructions.length);
      line = line.slice(labelMatch[0].length).trim();
      if (!line) continue;
    }
    const split = line.match(/^([A-Za-z]+)(?:\s+(.+))?$/);
    if (!split) throw new Error(`Line ${i + 1}: cannot parse instruction`);
    instructions.push({ op: split[1].toUpperCase(), args: split[2] ? split[2].split(',').map((arg) => arg.trim()) : [], line: i + 1 });
  }
  return { instructions, labels };
}

function expectCount(ins, count) {
  if (ins.args.length !== count) throw new Error(`Line ${ins.line}: ${ins.op} expects ${count} operand${count === 1 ? '' : 's'}`);
}
function register(name, ins) {
  const key = name.toUpperCase();
  if (!Object.hasOwn(vm.regs, key)) throw new Error(`Line ${ins.line}: unknown register ${name}`);
  return key;
}
function value(token, ins) {
  if (token === undefined || token === '') throw new Error(`Line ${ins.line}: missing value`);
  const key = token.toUpperCase();
  if (Object.hasOwn(vm.regs, key)) return vm.regs[key];
  const parsed = /^0X[\da-f]+$/i.test(token) ? Number.parseInt(token.slice(2), 16) : /^-?\d+$/.test(token) ? Number(token) : NaN;
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) throw new Error(`Line ${ins.line}: expected register or 8-bit value, got ${token}`);
  return parsed;
}
function address(token, ins, labels = vm.labels) {
  const label = token.toUpperCase();
  if (labels.has(label)) return labels.get(label);
  const parsed = Number(token);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) throw new Error(`Line ${ins.line}: invalid address or label ${token}`);
  return parsed;
}

function loadProgram() {
  const compiled = compile(sourceEl.value);
  vm.program = compiled.instructions; vm.labels = compiled.labels;
  if (!vm.program.length) throw new Error('Program is empty.');
  vm.pc = 0; vm.steps = 0; vm.zero = false; vm.input.length = 0;
  vm.regs = { A: 0, B: 0, C: 0, D: 0 };
  vm.memory.fill(0); vm.pixels.fill(0);
  render();
}

async function execute(ins) {
  const args = ins.args;
  const next = vm.pc + 1;
  switch (ins.op) {
    case 'SET': { expectCount(ins, 2); const r = register(args[0], ins); vm.regs[r] = value(args[1], ins); break; }
    case 'ADD': { expectCount(ins, 2); const r = register(args[0], ins); vm.regs[r] = (vm.regs[r] + value(args[1], ins)) & 255; vm.zero = vm.regs[r] === 0; break; }
    case 'SUB': { expectCount(ins, 2); const r = register(args[0], ins); vm.regs[r] = (vm.regs[r] - value(args[1], ins)) & 255; vm.zero = vm.regs[r] === 0; break; }
    case 'INC': { expectCount(ins, 1); const r = register(args[0], ins); vm.regs[r] = (vm.regs[r] + 1) & 255; vm.zero = vm.regs[r] === 0; break; }
    case 'DEC': { expectCount(ins, 1); const r = register(args[0], ins); vm.regs[r] = (vm.regs[r] - 1) & 255; vm.zero = vm.regs[r] === 0; break; }
    case 'CMP': { expectCount(ins, 2); vm.zero = vm.regs[register(args[0], ins)] === value(args[1], ins); break; }
    case 'JMP': { expectCount(ins, 1); vm.pc = address(args[0], ins); return; }
    case 'JZ': { expectCount(ins, 1); if (vm.zero) { vm.pc = address(args[0], ins); return; } break; }
    case 'JNZ': { expectCount(ins, 1); if (!vm.zero) { vm.pc = address(args[0], ins); return; } break; }
    case 'LOAD': { expectCount(ins, 2); const r = register(args[0], ins); vm.regs[r] = vm.memory[value(args[1], ins)]; break; }
    case 'STORE': { expectCount(ins, 2); vm.memory[value(args[0], ins)] = value(args[1], ins); break; }
    case 'DRAW': {
      expectCount(ins, 3);
      const x = value(args[0], ins), y = value(args[1], ins), pixel = value(args[2], ins);
      if (x > 7 || y > 7) throw new Error(`Line ${ins.line}: DRAW coordinates must be between 0 and 7`);
      vm.pixels[y * 8 + x] = pixel ? 1 : 0; break;
    }
    case 'IN': { expectCount(ins, 1); vm.regs[register(args[0], ins)] = vm.input.shift() ?? 0; break; }
    case 'OUT': { expectCount(ins, 1); log(String(value(args[0], ins))); break; }
    case 'WAIT': { expectCount(ins, 1); await new Promise((resolve) => setTimeout(resolve, Math.min(value(args[0], ins), 1000))); break; }
    case 'NOP': expectCount(ins, 0); break;
    case 'HALT': expectCount(ins, 0); vm.pc = vm.program.length; vm.running = false; setStatus('HALTED'); say(`Halted after ${vm.steps + 1} instructions.`); return;
    default: throw new Error(`Line ${ins.line}: unknown instruction ${ins.op}`);
  }
  vm.pc = next;
}

async function oneStep() {
  if (vm.pc < 0 || vm.pc >= vm.program.length) {
    vm.running = false; setStatus('HALTED'); say('Program counter is outside the program.'); return false;
  }
  const ins = vm.program[vm.pc];
  try {
    await execute(ins); vm.steps++;
    if (vm.steps > 100000) throw new Error('Execution stopped: 100,000 instruction safety limit reached.');
    render();
    if (!vm.running && statusEl.textContent !== 'HALTED') { setStatus('PAUSED'); }
    return true;
  } catch (error) {
    vm.running = false; setStatus('ERROR'); say(error.message, true); return false;
  }
}

async function runLoop(generation) {
  while (vm.running && generation === vm.generation) {
    const keepGoing = await oneStep();
    if (!keepGoing || !vm.running) break;
    if (vm.steps % 100 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

runButton.addEventListener('click', () => {
  try {
    if (vm.pc >= vm.program.length || statusEl.textContent === 'READY' || statusEl.textContent === 'HALTED' || statusEl.textContent === 'ERROR') loadProgram();
    vm.running = true; vm.generation++; setStatus('RUNNING'); say('Program is running.'); runLoop(vm.generation);
  } catch (error) { setStatus('ERROR'); say(error.message, true); }
});
pauseButton.addEventListener('click', () => {
  vm.running = false; vm.generation++; setStatus('PAUSED'); say(`Paused at instruction ${vm.pc}.`);
});
stepButton.addEventListener('click', async () => {
  try {
    if (statusEl.textContent === 'READY' || statusEl.textContent === 'HALTED' || statusEl.textContent === 'ERROR') loadProgram();
    setStatus('STEPPING'); await oneStep();
    if (vm.pc < vm.program.length && statusEl.textContent !== 'ERROR' && statusEl.textContent !== 'HALTED') setStatus('PAUSED');
  } catch (error) { setStatus('ERROR'); say(error.message, true); }
});
document.querySelector('#reset').addEventListener('click', () => {
  vm.running = false; vm.generation++;
  try { loadProgram(); setStatus('READY'); say('Machine reset.'); }
  catch (error) { setStatus('ERROR'); say(error.message, true); }
});
document.querySelectorAll('[data-key]').forEach((button) => button.addEventListener('click', () => {
  const key = Number(button.dataset.key); vm.input.push(key); log(`KEY ${key} queued`);
}));
document.querySelector('#clear-output').addEventListener('click', () => { outputEl.textContent = ''; });

render();
