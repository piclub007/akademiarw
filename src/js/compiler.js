// src/js/compiler.js

/**
 * Simple compiler for HTML/CSS/JS and Python (via Skulpt).
 * Usage: import { Compiler } from './compiler.js';
 */
export class Compiler {
  constructor() {
    this.skulptReady = false;
    this._loadSkulpt();
  }

  async _loadSkulpt() {
    if (window.Sk) {
      this.skulptReady = true;
      return;
    }
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js';
      script.onload = () => {
        const builtin = document.createElement('script');
        builtin.src = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js';
        builtin.onload = () => {
          this.skulptReady = true;
          resolve();
        };
        document.head.appendChild(builtin);
      };
      document.head.appendChild(script);
    });
  }

  async runCode(language, code) {
    switch (language) {
      case 'html':
        return { type: 'html', code };
      case 'css':
        return { type: 'html', code: `<style>${code}</style><div>CSS applied</div>` };
      case 'javascript':
        return { type: 'script', code };
      case 'python':
        if (!this.skulptReady) {
          return { type: 'text', output: 'Python compiler is still loading. Please wait a moment and try again.' };
        }
        try {
          const output = await this._runPython(code);
          return { type: 'text', output };
        } catch (e) {
          return { type: 'text', output: `Error: ${e.toString()}` };
        }
      default:
        return { type: 'text', output: 'Unsupported language' };
    }
  }

  async _runPython(code) {
    return new Promise((resolve, reject) => {
      let output = '';
      window.Sk.configure({
        output: (text) => { output += text; },
        read: (x) => { throw 'File not found: ' + x; }
      });
      window.Sk.misceval.asyncToPromise(() =>
        window.Sk.importMainWithBody('<stdin>', false, code, true)
      ).then(
        () => resolve(output),
        (err) => reject(err.toString())
      );
    });
  }
}
