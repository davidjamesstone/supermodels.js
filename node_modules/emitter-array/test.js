var emitterArray = require('./index');


var ea, log;


log = function() { console.log.apply(console, arguments); };

ea = emitterArray('a', 'b', 'c');
ea.on('change', log);

ea.push('d');

log(ea);

