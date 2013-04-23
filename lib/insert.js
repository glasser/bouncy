var stream = require('stream');
var util = require('util');

module.exports = function (opts) {
    var streamClass = function () {
      stream.Transform.call(this);
    };
    util.inherits(streamClass, stream.Transform);

    var inHeader = true;
    var headersLower = opts.headers
        && Object.keys(opts.headers).reduce(function (acc, key) {
            acc[key.toLowerCase()] = opts.headers[key];
            return acc;
        }, {})
    ;
    var line = '';
    var firstLine = true;

    streamClass.prototype._transform = function (buf, encoding, done) {
        if (!inHeader) {
            this.push(buf);
            done();
            return;
        }
        
        for (var i = 0; i < buf.length; i++) {
            if (buf[i] !== 10) {
                line += String.fromCharCode(buf[i]);
                continue;
            }
            
            if (line === '' || line === '\r') {
                inHeader = false;
                if (opts.headers) {
                    this.push(Object.keys(opts.headers).map(function (key) {
                        return key + ': ' + opts.headers[key];
                    }).join(line + '\n') + line + '\n' + line + '\n');
                }
                else {
                    this.push(line + '\n');
                }
                line = undefined;
                this.push(buf.slice(i + 1));
                done();
                return;
            }
            
            if (firstLine) {
                firstLine = false;
                if (opts.method || opts.path) {
                    line = line.replace(/^(\S+)\s+(\S+)/, function (_, m, p) {
                        return (opts.method || m).toUpperCase()
                            + ' ' + (opts.path || p)
                        ;
                    });
                }
                this.push(line + '\n');
                line = '';
                continue;
            }
            firstLine = false;
            
            var m = line.match(/^([^:]+)\s*:/);
            if (!m) {
                this.push(line + '\n');
            }
            else {
                var key = m[1];
                var lowerKey = key.toLowerCase();
                
                if (!headersLower || !headersLower[lowerKey]) {
                    this.push(line + '\n');
                }
            }
            line = '';
        }
        done();
    };
    return new streamClass();
}
