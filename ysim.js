var fs = require('fs');
var _ = require('./js/underscore.js')._;
eval(fs.readFileSync('js/general.js', { encoding: 'utf8' }));
eval(fs.readFileSync('js/instr.js', { encoding: 'utf8' }));
eval(fs.readFileSync('js/assem.js', { encoding: 'utf8' }));
eval(fs.readFileSync('js/syntax.js', { encoding: 'utf8' }));
eval(fs.readFileSync('js/y86.js', { encoding: 'utf8' }));

function copy (src)  {
	var len = src.byteLength;
	var dst = new Uint8Array(len);
	for (var i = 0; i < len; i++)
		dst[i] = src[i];
	return dst;
}

function diff (a, b) {
	var addresses = {};
	for (var i = 0; i < MEM_SIZE; i++)
		if (a[i] !== b[i])
			addresses[Math.floor(i / 4) * 4] = true;

	var changes = [];
	for (var addr in addresses)
		if (addresses.hasOwnProperty(addr))
			changes.push({
				address: +addr,
				oldValue: LD(+addr, a),
				newValue: LD(+addr, b)
			})

	changes.sort(function (a, b) { return a.address - b.address; });
	return changes;
}

function assemble (source) {
	return ASSEMBLE(source);
}

function run (object) {
	RESET();

	var initialState = toByteArray(object);
	MEMORY = copy(initialState);

	while (PC.lessThan(MEM_SIZE) && STAT === 'AOK') {
		STEP();
	}

	return {
		pc: PC,
		modifiedMemory: diff(initialState, MEMORY),
		registers: {
			rax: REG[0],
			rcx: REG[1],
			rdx: REG[2],
			rbx: REG[3],
			rsp: REG[4],
			rbp: REG[5],
			rsi: REG[6],
			rdi: REG[7],
			r8:  REG[8],
			r9:  REG[9],
			r10: REG[10],
			r11: REG[11],
			r12: REG[12],
			r13: REG[13],
			r14: REG[14],
		},
		flags: {
			sf: SF,
			zf: ZF,
			of: OF
		},
		status: STAT,
		error: ERR
	}
}

exports.assemble = assemble;
exports.run = run;

var usage = 'Usage: node ysim.js (c source.ys object.yo | r object.yo)';

if (require.main === module) {
	if (process.argv[2] === 'c') {
		if (process.argv.length !== 5) {
			console.log(usage);
			return;
		}

		var source = fs.readFileSync(process.argv[3], { encoding: 'utf8' });
		var object = assemble(source);
		if (object.errors.length) {
			console.error(object.errors.map(function (e) { return 'Error at line ' + e[0] + ': ' + e[1]; }).join('\n'));
			process.exit(1);
			return;
		}

		fs.writeFile(process.argv[4], object.obj);
	} else if (process.argv[2] === 'r') {
		if (process.argv.length !== 4) {
			console.log(usage);
			return;
		}

		var object = fs.readFileSync(process.argv[3], { encoding: 'utf8' });
		var result = run(object);
		console.log(require('util').inspect(result));
	} else {
		console.log(usage);
	}
}
