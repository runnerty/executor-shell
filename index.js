'use strict';

const spawn = require('child_process').spawn;
const spawnSsh = require('ssh2').Client;
const fs = require('fs');

const Execution = global.ExecutionClass;

class shellExecutor extends Execution {
  constructor(process) {
    super(process);
    this.debug = false;
  }

  async exec(execValues) {
    const endOptions = { end: 'end' };
    const shell = {};
    this.debug = execValues.debug || false;

    if (this.debug) this.logger.log('info', 'SHELL DEBUG - INIT:', execValues);

    const cmd = execValues.command;
    shell.execute_args = [];
    shell.execute_args_line = '';

    if (execValues.args instanceof Array) {
      shell.execute_args = execValues.args;
      for (let i = 0; i < execValues.args.length; i++) {
        shell.execute_args_line = (shell.execute_args_line ? shell.execute_args_line + ' ' : '') + execValues.args[i];
      }
    }

    shell.command_executed = cmd + ' ' + shell.execute_args_line;
    endOptions.command_executed = shell.command_executed;

    if (this.debug) this.logger.log('info', 'SHELL DEBUG - Command to execute:', shell.command_executed);

    try {
      const res = await this.execCommand(execValues, shell.command_executed, true);
      if (!this.killing) {
        this.killing = false;
        if (res.code === 0) {
          endOptions.end = 'end';
          endOptions.msg_output = res.stdout;
          endOptions.err_output = res.stderr;
          // outputJSON:
          if (execValues.outputJSON) {
            try {
              endOptions.data_output = JSON.parse(res.stdout);
              endOptions.extra_output = {};
              const object = JSON.parse(res.stdout);
              for (const key in object) {
                endOptions.extra_output['JSON_' + key] = object[key];
              }
            } catch (err) {
              endOptions.end = 'error';
              endOptions.messageLog = ' ERROR: THE OUTPUT PROCESS IS NOT A VALID JSON OBJECT:' + res.stdout;
              endOptions.err_output = ' ERROR: THE OUTPUT PROCESS IS NOT A VALID JSON OBJECT:' + res.stdout;
              endOptions.msg_output = ' ERROR: THE OUTPUT PROCESS IS NOT A VALID JSON OBJECT:' + res.stdout;
              this.end(endOptions);
            }
          }
          this.end(endOptions);
        } else {
          endOptions.end = 'error';
          endOptions.messageLog = ' ERROR: ' + res.code + ' - ' + res.stdout + ' - ' + res.stderr;
          endOptions.err_output = res.stderr;
          endOptions.msg_output = res.stdout;
          endOptions.retries_count = endOptions.retries_count + 1 || 1;
          this.end(endOptions);
        }
      }
    } catch (err) {
      endOptions.end = 'error';
      endOptions.messageLog = ' ERROR: ' + err;
      endOptions.err_output = err;
      endOptions.msg_output = err;
      this.end(endOptions);
    }
  }

  execCommand(execValues, command, getPID) {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      const shell = {};

      if (execValues.host) {
        const connection = {};
        connection.username = execValues.username;
        connection.host = execValues.host;
        connection.port = execValues.port || 22;

        if (this.debug)
          this.logger.log(
            'info',
            `SHELL DEBUG - Remote shell. Host:${execValues.host} / username:${connection.username}/ port:${connection.port} / privateKey:${execValues.privateKey}.`
          );

        if (execValues.privateKey) {
          try {
            connection.privateKey = fs.readFileSync(execValues.privateKey);
          } catch (err) {
            reject('Reading privateKey:', connection.privateKey, err);
          }
        }

        let streamEnd = false;
        shell.proc = new spawnSsh();
        shell.proc
          .on('ready', () => {
            if (this.debug) this.logger.log('info', `SHELL DEBUG - Remote shell. Connection: READY.`);
            streamEnd = false;
            if (getPID) command = `sh -c 'echo [__PID $$ PID__]; exec ${command}'`;

            if (this.debug) this.logger.log('info', `SHELL DEBUG - Remote real command:${command}`);

            shell.proc.exec(command, (err, stream) => {
              if (err) {
                if (this.debug) this.logger.log('info', `SHELL DEBUG - Remote exec error:${err}`);
                resolve({ stdout: stdout, stderr: stderr, err: err });
              }
              stream
                .on('end', () => {
                  streamEnd = true;
                  if (this.debug) this.logger.log('info', `SHELL DEBUG - Remote Stream: END.`);
                })
                .on('close', (code, signal) => {
                  if (this.debug)
                    this.logger.log('info', `SHELL DEBUG - Remote Stream: CLOSE. Code:${code} / Signal:${signal}`);

                  shell.proc.end();

                  if (signal === 'SIGTERM') {
                    reject('Remote kill process:', signal);
                  } else {
                    resolve({
                      stdout: stdout,
                      stderr: stderr,
                      code: code,
                      signal: signal
                    });
                  }
                })
                .on('data', chunk => {
                  stdout += chunk;
                  if (getPID) {
                    const pIitPid = stdout.indexOf('[__PID ');
                    const pEndPid = stdout.indexOf(' PID__]');
                    if (pIitPid > -1 && pEndPid > -1) {
                      const longPid = pIitPid - 7 + pEndPid;
                      shell.proc.pid = stdout.substr(pIitPid + 7, longPid);
                      this.pid = shell.proc.pid;
                      this.shell_proc = shell.proc;

                      if (this.debug) this.logger.log('info', `SHELL DEBUG - Remote Stream: DATA. PID:${this.pid}`);

                      stdout = stdout.substr(0, pIitPid) + stdout.substr(pEndPid + 8, stdout.length);
                    }
                  }
                  if (this.debug) this.logger.log('info', `SHELL DEBUG - Remote Stream DATA:${chunk}`);
                })
                .stderr.on('data', chunk => {
                  stderr += chunk;
                  if (this.debug) this.logger.log('info', `SHELL DEBUG - Remote Stream STDERR-DATA:${chunk}`);
                });
            });
          })
          .connect(connection);

        shell.proc.on('error', err => {
          if (this.debug) this.logger.log('info', `SHELL DEBUG - Remote connection: ERROR.`, err);

          reject('' + err);
          shell.proc.end();
        });

        shell.proc.on('end', _ => {
          if (this.debug) this.logger.log('info', `SHELL DEBUG - Remote connection: END.`);
          if (!streamEnd) {
            reject('Lost remote connection');
          }
        });
      } else {
        if (this.debug) this.logger.log('info', `SHELL DEBUG -  Real command:${command}`);

        shell.proc = spawn(command, [], { shell: true });

        shell.proc.stdout.on('data', chunk => {
          stdout += chunk;
          if (getPID) {
            this.pid = shell.proc.pid;
            if (this.debug) this.logger.log('info', `SHELL DEBUG - DATA. PID:${this.pid}`);
          }
        });
        shell.proc.stderr.on('data', chunk => {
          stderr += chunk;
        });
        shell.proc.on('close', (code, signal) => {
          if (this.debug) this.logger.log('info', `SHELL DEBUG - CLOSE. Code:${code} / Signal:${signal}`);
          resolve({
            stdout: stdout,
            stderr: stderr,
            code: code,
            signal: signal
          });
        });
      }
    });
  }

  async killChildProcess(pid, execValues) {
    const command = 'kill -s SIGKILL ' + pid;
    try {
      await this.execCommand(execValues, command);
      if (this.debug) this.logger.log('info', `SHELL DEBUG - killChildProcess. COMMAND:${command}: Success.`);
    } catch (err) {
      if (this.debug) this.logger.log('info', `SHELL DEBUG - killChildProcess. COMMAND:${command}: Error:`, err);
      throw err;
    }
  }

  async killChildsProcess(pidLines, times, pidParent, execValues) {
    try {
      if (times === -1) {
        await this.killChildProcess(pidParent, execValues);
      } else {
        const procLine = pidLines[times];
        const proc = procLine.trim().split(/\s+/);

        if (proc[1] === pidParent) {
          this.killChildsProcess(pidLines, pidLines.length - 2, proc[2], execValues).catch();
          times--;
          await this.killChildsProcess(pidLines, times, pidParent, execValues);
        } else {
          times--;
          await this.killChildsProcess(pidLines, times, pidParent, execValues);
        }
      }
    } catch (err) {
      throw err;
    }
  }

  async killProcess(pid, execValues) {
    try {
      const res = await this.execCommand(execValues, 'ps -A -o comm,ppid,pid,stat');
      if (res.signal !== 'SIGKILL') {
        if (res.code === 0) {
          const pidList = res.stdout.split('\n');
          const numItemsList = pidList.length - 2;
          await this.killChildsProcess(pidList, numItemsList, pid, execValues);
        } else {
          throw new Error(res);
        }
      }
    } catch (err) {
      throw err;
    }
  }

  async kill(execValues, reason) {
    const endOptions = { end: 'end' };
    this.killing = true;

    try {
      await this.killProcess(this.pid, execValues);
      endOptions.end = 'end';
      endOptions.msg_output = 'KILLED ' + reason;
      this.end(endOptions);
    } catch (err) {
      endOptions.end = 'error';
      endOptions.messageLog = ' ERROR: KILLING:' + reason + err;
      endOptions.err_output = err;
      endOptions.msg_output = err;
      this.end(endOptions);
    }
  }
}

module.exports = shellExecutor;
