# QVM Mobile

A mobile-friendly, browser-based virtual machine emulator for QVM. It is intentionally dependency-free and runs locally in a modern mobile or desktop browser. This is a small educational VM, not an Android/iOS device emulator or a sandbox for running native apps.

## Run it

Open `index.html` in a browser, or serve this directory with any static HTTP server. No build step or installation is required. The interface adapts to phone screens and supports touch input.

## QVM-8 machine

- Four 8-bit registers: `A`, `B`, `C`, and `D`.
- 256 bytes of memory; the UI displays the first 16 bytes.
- An 8 × 8 monochrome virtual display.
- A zero flag, program counter, instruction stepping, run/pause/reset, and a 100,000-instruction safety limit.
- Four touch keys (`0`–`3`), read in order by `IN`.

### Instruction set

| Instruction | Behavior |
| --- | --- |
| `SET reg, value` | Set a register to an 8-bit value. |
| `ADD reg, value` / `SUB reg, value` | Add or subtract, wrapping at 8 bits; update zero flag. |
| `INC reg` / `DEC reg` | Increment or decrement, wrapping at 8 bits; update zero flag. |
| `CMP reg, value` | Set zero flag if equal. |
| `JMP label` / `JZ label` / `JNZ label` | Unconditional / zero / not-zero jump. Numeric instruction addresses also work. |
| `LOAD reg, address` / `STORE address, value` | Read or write one byte of memory. |
| `DRAW x, y, value` | Set a display pixel; `x` and `y` must be 0–7. |
| `IN reg` | Read the next queued touch key, or 0 if no key is queued. |
| `OUT value` | Append a value to VM output. |
| `WAIT milliseconds` | Wait for up to one second. |
| `NOP` / `HALT` | Do nothing / stop execution. |

Registers can be used as value operands. Numeric values are decimal or hexadecimal (`0x2A`), with a range of 0–255. Instructions and registers are case-insensitive. Use `;` for comments and `LABEL:` for labels. For example:

```asm
SET A, 0
SET B, 3
LOOP:
  DRAW A, B, 1
  ADD A, 1
  CMP A, 8
  JNZ LOOP
HALT
```

## Scope

QVM Mobile is a starter emulator system with a custom, documented bytecode-like assembly and a simple virtual display. It does not emulate a specific commercial mobile operating system, CPU, or hardware platform. Future extensions could add a binary file format, sound, persistence, and native packaging.
