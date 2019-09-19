'use strict';

const spawn = require('child_process').spawn;
const spawnSsh = require('ssh2').Client;
const fs = require('fs');

const Execution = global.ExecutionClass;

let debug = false;

class shellExecutor extends Execution {
  constructor(process) {
    super(process);
  }

  execCommand(execValues, command, getPID) {
    const _this = this;
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let shell = {};

      if (execValues.host) {
        let connection = {};
        connection.username = execValues.username;
        connection.host = execValues.host;
        connection.port = execValues.port || 22;

        if (debug)
          _this.logger.log(
            'info',
            `SHELL DEBUG - Remote shell. Host:${execValues.host}. Connection:${connection}. PrivateKey:${execValues.privateKey}.`
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
            if (debug)
              _this.logger.log(
                'info',
                `SHELL DEBUG - Remote shell. Connection: READY.`
              );
            streamEnd = false;
            if (getPID)
              command = `sh -c 'echo [__PID $$ PID__]; exec ${command}'`;

            if (debug)
              _this.logger.log(
                'info',
                `SHELL DEBUG - Remote real command:${command}`
              );

            shell.proc.exec(command, (err, stream) => {
              if (err) {
                if (debug)
                  _this.logger.log(
                    'info',
                    `SHELL DEBUG - Remote exec error:${err}`
                  );
                resolve({ stdout: stdout, stderr: stderr, err: err });
              }
              stream
                .on('end', () => {
                  streamEnd = true;
                  if (debug)
                    _this.logger.log(
                      'info',
                      `SHELL DEBUG - Remote Stream: END.`
                    );
                })
                .on('close', (code, signal) => {
                  if (debug)
                    _this.logger.log(
                      'info',
                      `SHELL DEBUG - Remote Stream: CLOSE. Code:${code} / Signal:${signal}`
                    );

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
                    let pIitPid = stdout.indexOf('[__PID ');
                    let pEndPid = stdout.indexOf(' PID__]');
                    if (pIitPid > -1 && pEndPid > -1) {
                      let longPid = pIitPid - 7 + pEndPid;
                      shell.proc.pid = stdout.substr(pIitPid + 7, longPid);
                      _this.pid = shell.proc.pid;
                      _this.shell_proc = shell.proc;

                      if (debug)
                        _this.logger.log(
                          'info',
                          `SHELL DEBUG - Remote Stream: DATA. PID:${_this.pid} / PROC:${_this.shell_proc}`
                        );

                      stdout =
                        stdout.substr(0, pIitPid) +
                        stdout.substr(pEndPid + 8, stdout.length);
                    }
                  }
                })
                .stderr.on('data', chunk => {
                  stderr += chunk;
                });
            });
          })
          .connect(connection);

        shell.proc.on('error', err => {
          if (debug)
            _this.logger.log(
              'info',
              `SHELL DEBUG - Remote connection: ERROR.`,
              err
            );

          reject('' + err);
          shell.proc.end();
        });

        shell.proc.on('end', _ => {
          if (debug)
            _this.logger.log('info', `SHELL DEBUG - Remote connection: END.`);
          if (!streamEnd) {
            reject('Lost remote connection');
          }
        });
      } else {
        if (debug)
          _this.logger.log('info', `SHELL DEBUG -  Real command:${command}`);

        shell.proc = spawn(command, [], { shell: true });

        shell.proc.stdout.on('data', chunk => {
          stdout += chunk;
          if (getPID) {
            _this.pid = shell.proc.pid;
            if (debug)
              _this.logger.log('info', `SHELL DEBUG - DATA. PID:${_this.pid}`);
          }
        });
        shell.proc.stderr.on('data', chunk => {
          stderr += chunk;
        });
        shell.proc.on('close', (code, signal) => {
          if (debug)
            _this.logger.log(
              'info',
              `SHELL DEBUG - CLOSE. Code:${code} / Signal:${signal}`
            );
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

  killChildProcess(pid, execValues) {
    const _this = this;
    return new Promise((resolve, reject) => {
      let command = 'kill -s SIGKILL ' + pid;

      _this
        .execCommand(execValues, command)
        .then(() => {
          if (debug)
            _this.logger.log(
              'info',
              `SHELL DEBUG - killChildProcess. COMMAND:${command}: Success.`
            );
          resolve();
        })
        .catch(err => {
          if (debug)
            _this.logger.log(
              'info',
              `SHELL DEBUG - killChildProcess. COMMAND:${command}: Error:`,
              err
            );
          reject(err);
        });
    });
  }

  killChildsProcess(pidLines, times, pidParent, execValues) {
    const _this = this;
    return new Promise((resolve, reject) => {
      if (times === -1) {
        _this
          .killChildProcess(pidParent, execValues)
          .then(() => {
            resolve();
          })
          .catch(err => {
            reject(err);
          });
      } else {
        let procLine = pidLines[times];
        let proc = procLine.trim().split(/\s+/);

        if (proc[1] === pidParent) {
          _this
            .killChildsProcess(
              pidLines,
              pidLines.length - 2,
              proc[2],
              execValues
            )
            .then(() => {
              times--;
              resolve(
                _this.killChildsProcess(pidLines, times, pidParent, execValues)
              );
            })
            .catch(() => {
              times--;
              resolve(
                _this.killChildsProcess(pidLines, times, pidParent, execValues)
              );
            });
        } else {
          times--;
          resolve(
            _this.killChildsProcess(pidLines, times, pidParent, execValues)
          );
        }
      }
    });
  }

  killProcess(pid, execValues) {
    const _this = this;
    return new Promise((resolve, reject) => {
      _this
        .execCommand(execValues, 'ps -A -o comm,ppid,pid,stat')
        .then(res => {
          if (res.signal === 'SIGKILL') {
            resolve();
          } else {
            if (res.code === 0) {
              let pidList = res.stdout.split('\n');
              let numItemsList = pidList.length - 2;

              _this
                .killChildsProcess(pidList, numItemsList, pid, execValues)
                .then(() => {
                  resolve();
                })
                .catch(err => {
                  reject(err);
                });
            } else {
              reject(res);
            }
          }
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  exec(execValues) {
    const _this = this;
    let endOptions = { end: 'end' };
    let shell = {};
    debug = execValues.debug || false;

    if (debug) _this.logger.log('info', 'SHELL DEBUG - INIT:', execValues);

    let cmd = execValues.command;
    shell.execute_args = [];
    shell.execute_args_line = '';

    if (execValues.args instanceof Array) {
      shell.execute_args = execValues.args;
      for (let i = 0; i < execValues.args.length; i++) {
        shell.execute_args_line =
          (shell.execute_args_line ? shell.execute_args_line + ' ' : '') +
          execValues.args[i];
      }
    }

    shell.command_executed = cmd + ' ' + shell.execute_args_line;
    endOptions.command_executed = shell.command_executed;

    if (debug)
      _this.logger.log(
        'info',
        'SHELL DEBUG - Command to execute:',
        shell.command_executed
      );

    _this
      .execCommand(execValues, shell.command_executed, true)
      .then(res => {
        if (!_this.killing) {
          _this.killing = false;
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
                endOptions.messageLog =
                  ' ERROR: THE OUTPUT PROCESS IS NOT A VALID JSON OBJECT:' +
                  res.stdout;
                endOptions.err_output =
                  ' ERROR: THE OUTPUT PROCESS IS NOT A VALID JSON OBJECT:' +
                  res.stdout;
                endOptions.msg_output =
                  ' ERROR: THE OUTPUT PROCESS IS NOT A VALID JSON OBJECT:' +
                  res.stdout;
                _this.end(endOptions);
              }
            }
            _this.end(endOptions);
          } else {
            endOptions.end = 'error';
            endOptions.messageLog =
              ' ERROR: ' + res.code + ' - ' + res.stdout + ' - ' + res.stderr;
            endOptions.err_output = res.stderr;
            endOptions.msg_output = res.stdout;
            endOptions.retries_count = endOptions.retries_count + 1 || 1;
            _this.end(endOptions);
          }
        }
      })
      .catch(err => {
        endOptions.end = 'error';
        endOptions.messageLog = ' ERROR: ' + err;
        endOptions.err_output = err;
        endOptions.msg_output = err;
        _this.end(endOptions);
      });
  }

  kill(execValues, reason) {
    const _this = this;
    let endOptions = { end: 'end' };

    _this.killing = true;

    _this
      .killProcess(_this.pid, execValues)
      .then(() => {
        endOptions.end = 'end';
        endOptions.msg_output = 'KILLED ' + reason;
        _this.end(endOptions);
      })
      .catch(err => {
        endOptions.end = 'error';
        endOptions.messageLog = ' ERROR: KILLING:' + reason + err;
        endOptions.err_output = err;
        endOptions.msg_output = err;
        _this.end(endOptions);
      });
  }
}

module.exports = shellExecutor;
