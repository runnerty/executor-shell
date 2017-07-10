"use strict";

var spawn = require("child_process").spawn;
var spawnSsh = require("ssh2").Client;
var fs = require("fs");

var Execution = global.ExecutionClass;

class shellExecutor extends Execution {
  constructor(process) {
    super(process);
  }

  execCommand(execValues, command, getPID) {
    var _this = this;
    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let shell = {};

      if (execValues.host) {
        let connection = {};
        connection.username = execValues.username;
        connection.host = execValues.host;
        connection.port = execValues.port || 22;
        if (execValues.privateKey) connection.privateKey = fs.readFileSync(execValues.privateKey);

        shell.proc = new spawnSsh();
        shell.proc.on("ready", function () {
          if (getPID) command = command + " & echo [__PID $! PID__]";
          shell.proc.exec(command, function (err, stream) {
            if (err) {
              resolve({"stdout": stdout, "stderr": stderr, "err": err});
            }
            stream.on("close", function (code, signal) {
              shell.proc.end();
              resolve({"stdout": stdout, "stderr": stderr, "code": code, "signal": signal});
            })
              .on("data", function (chunk) {
                stdout += chunk;
                if (getPID) {
                  let pIitPid = stdout.indexOf("[__PID ");
                  let pEndPid = stdout.indexOf(" PID__]");
                  if (pIitPid > -1 && pEndPid > -1) {
                    let longPid = pIitPid - 7 + pEndPid;
                    shell.proc.pid = stdout.substr(pIitPid + 7, longPid);
                    _this.pid = shell.proc.pid;
                    _this.shell_proc = shell.proc;
                    stdout = stdout.substr(0, pIitPid) + stdout.substr(pEndPid + 8, stdout.length);
                  }
                }
              }).stderr.on("data", function (chunk) {
              stderr += chunk;
            });
          });
        }).connect(connection);
      } else {
        shell.proc = spawn(command, [], {shell: true});

        shell.proc.stdout.on("data", function (chunk) {
          stdout += chunk;
          if (getPID) {
            _this.pid = shell.proc.pid;
          }
        });
        shell.proc.stderr.on("data", function (chunk) {
          stderr += chunk;
        });
        shell.proc
          .on("close", function (code, signal) {
            resolve({"stdout": stdout, "stderr": stderr, "code": code, "signal": signal});
          });
      }
    });
  }

  killChildProcess(pid, execValues) {
    var _this = this;
    return new Promise((resolve) => {
      let command = "kill -s SIGKILL " + pid;

      _this.execCommand(execValues, command)
        .then(() => {
          resolve();
        })
        .catch((err) => {
          resolve(err);
        });
    });
  }

  killChildsProcess(pidLines, times, pidParent, execValues) {
    var _this = this;
    return new Promise(function (resolve, reject) {
      if (times === -1) {
        _this.killChildProcess(pidParent, execValues)
          .then(() => {
            resolve();
          })
          .catch(function (err) {
            reject(err);
          });

      } else {
        let procLine = pidLines[times];
        let proc = procLine.trim().split(/\s+/);

        if (proc[1] === pidParent) {
          _this.killChildsProcess(pidLines, pidLines.length - 2, proc[2], execValues)
            .then(() => {
              times--;
              resolve(_this.killChildsProcess(pidLines, times, pidParent, execValues));
            })
            .catch(function () {
              times--;
              resolve(_this.killChildsProcess(pidLines, times, pidParent, execValues));
            });
        } else {
          times--;
          resolve(_this.killChildsProcess(pidLines, times, pidParent, execValues));
        }
      }
    });
  }

  killProcess(pid, execValues) {
    var _this = this;
    return new Promise(function (resolve, reject) {
      _this.execCommand(execValues, "ps -A -o comm,ppid,pid,stat")
        .then((res) => {
          if (res.signal === "SIGKILL") {
            resolve();
          } else {
            if (res.code === 0) {
              let pidList = res.stdout.split("\n");
              let numItemsList = pidList.length - 2;

              _this.killChildsProcess(pidList, numItemsList, pid, execValues)
                .then(() => {
                  resolve();
                })
                .catch(function (err) {
                  reject(err);
                });
            } else {
              reject(res);
            }
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  exec(execValues) {
    var _this = this;
    var endOptions = {end: "end"};
    var shell = {};

    var cmd = execValues.command;
    shell.execute_args = [];
    shell.execute_args_line = "";

    if (execValues.args instanceof Array) {
      shell.execute_args = execValues.args;
      for (var i = 0; i < execValues.args.length; i++) {
        shell.execute_args_line = (shell.execute_args_line ? shell.execute_args_line + " " : "") + execValues.args[i];
      }
    }

    shell.command_executed = cmd + " " + shell.execute_args_line;
    endOptions.command_executed = shell.command_executed;

    _this.execCommand(execValues, shell.command_executed, true)
      .then((res) => {
        if(!_this.killing){
          _this.killing = false;
          if (res.code === 0) {
            endOptions.end = "end";
            endOptions.msg_output = res.stdout;
            endOptions.err_output = res.stderr;
            _this.end(endOptions);
          } else {
            endOptions.end = "error";
            endOptions.messageLog = " ERROR: " + res.code + " - " + res.stdout + " - " + res.stderr;
            endOptions.err_output = res.stderr;
            endOptions.msg_output = res.stdout;
            endOptions.retries_count = endOptions.retries_count + 1 || 1;
            _this.end(endOptions);
          }
        }
      })
      .catch(function (err) {
        endOptions.end = "error";
        endOptions.messageLog = " ERROR: " + err;
        endOptions.err_output = err;
        endOptions.msg_output = err;
        _this.end(endOptions);
      });
  }

  kill(execValues, reason) {
    var _this = this;
    var endOptions = {end: "end"};

    _this.killing = true;

    _this.killProcess(_this.pid, execValues)
      .then(() => {
        endOptions.end = "end";
        endOptions.msg_output = "KILLED " + reason;
        _this.end(endOptions);
      })
      .catch(function (err) {
        endOptions.end = "error";
        endOptions.messageLog = " ERROR: KILLING:" + reason + err;
        endOptions.err_output = err;
        endOptions.msg_output = err;
        _this.end(endOptions);
      });
  }
}

module.exports = shellExecutor;