import * as vm from 'vm';
import VMOptions from './vm-options';
import VMRequireOptions from './vm-require-options';

const { Module } = require('module');

export default class {
  private options: VMOptions = {
    require: false,
    console: true,
	timeout: 0,
  };

  public constructor(options: VMOptions) {
    this.options = {...this.options, ...options};
  }

  public run(code: string, filename?: string) {
    const newModule = new Module(filename);
    newModule.filename = filename;
    newModule.paths = [filename];
    newModule.loaded = true;

    const newModuleCopy = { ...newModule };

    const context: any = {
      ...this.options.sandbox,
      module: newModuleCopy,
      exports: newModuleCopy.exports,
    };

    if (this.options.console) {
      context.console = console;
    }

    if (this.options.require) {
      context.require = (id: string) => {
        if (id.startsWith('.')) {
          return newModule.require(id);
        }

        if (typeof this.options.require === 'object') {
          const req = this.options.require as VMRequireOptions;
          if (req.builtin[0] === '*') {
            if (req.mock[id]) return req.mock[id];
            return newModule.require(id);
          }

          const mod = req.builtin.find(x => x === id);
          if (mod) {
            if (req.mock && req.mock[id]) return req.mock[id];
            return newModule.require(id);
          }
        }
        return null;
      };

      context.module.require = context.require;
    }

    const script = new vm.Script(code, {
      filename,
    });

    return {
      result: script.runInNewContext(context, { timeout: this.options.timeout }),
      script,
      context,
    };
  }
}
