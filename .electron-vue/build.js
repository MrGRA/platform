'use strict';

process.env.NODE_ENV = 'production';

const { say } = require('cfonts');
const chalk = require('chalk');
const del = require('del');
const { spawn } = require('child_process');
const webpack = require('webpack');
const Multispinner = require('multispinner');


const mainConfig = require('./webpack.main.config');
const rendererConfig = require('./webpack.renderer.config');
const webConfig = require('./webpack.web.config');
const mobileConfig = require('./webpack.mobile.config');

const doneLog = chalk.bgGreen.white(' DONE ') + ' ';
const errorLog = chalk.bgRed.white(' ERROR ') + ' ';
const okayLog = chalk.bgBlue.white(' OKAY ') + ' ';
const isCI = process.env.CI || false;

console.log('Build Target - ', process.env.BUILD_TARGET || 'Desktop');

function clean() {
	console.log('Cleaning Build.');
	del.sync(['build/*', '!build/icons', '!build/icons/icon.*']);
	console.log(`\n${doneLog}\n`);
	process.exit();
}

function greeting () {
	const cols = process.stdout.columns;
	let text = '';

	if (cols > 85) {
		text = 'lets-build';
	} else if (cols > 60) {
		text = 'lets-|build';
	} else {
		text = false;
	}

	if (text && !isCI) {
		say(text, {
			colors: ['yellow'],
			font: 'simple3d',
			space: false,
		});
	} else {
		console.log(chalk.yellow.bold('\n  lets-build'));
	}
	console.log();
}


function pack(config) {
	return new Promise((resolve, reject) => {
		webpack(config, (err, stats) => {
			if (err) reject(err.stack || err)
			else if (stats.hasErrors()) {
				let err = '';

				stats.toString({
					chunks: false,
					colors: true,
				})
				.split(/\r?\n/)
				.forEach((line) => {
					err += `${line}\n`;
				});

				reject(err);
			} else {
				resolve(stats.toString({
					chunks: false,
					colors: true,
				}));
			}
		});
	});
}

function build() {
	console.log('Starting to pack for Desktop');
	greeting();

	del.sync(['dist/electron/*', '!.gitkeep']);

	const tasks = ['main', 'renderer'];
	const m = new Multispinner(tasks, {
		preText: 'building',
		postText: 'process',
	});

	let results = '';

	m.on('success', () => {
		process.stdout.write('\x1B[2J\x1B[0f');
		console.log(`\n\n${results}`);
		console.log(`${okayLog}take it away ${chalk.yellow('`electron-builder`')}\n`);
		process.exit();
	});

	pack(mainConfig).then((result) => {
		results += result + '\n\n';
		m.success('main');
	}).catch((err) => {
		m.error('main');
		console.log(`\n  ${errorLog}failed to build main process`);
		console.error(`\n${err}\n`);
		process.exit(1);
	});

	pack(rendererConfig).then((result) => {
		results += result + '\n\n';
		m.success('renderer');
	}).catch((err) => {
		m.error('renderer');
		console.log(`\n  ${errorLog}failed to build renderer process`);
		console.error(`\n${err}\n`);
		process.exit(1);
	});
}


function web() {
	console.log('Starting to pack for Web');
	greeting();

	del.sync(['dist/web/*', '!.gitkeep']);

	webpack(webConfig, (err, stats) => {
		if (err || stats.hasErrors()) console.log(err);

		console.log(stats.toString({
			chunks: false,
			colors: true,
		}));

		process.exit();
	});
}

function mobile () {
	console.log('Starting to pack for Mobile');
	greeting();

	del.sync(['dist/mobile/*', '!.gitkeep']);

	webpack(mobileConfig, (err, stats) => {
		if (err || stats.hasErrors()) console.log(err);

		console.log(stats.toString({
			chunks: false,
			colors: true,
		}));

		process.exit();
	});
}

if (process.env.BUILD_TARGET === 'clean') {
	clean();
} else if (process.env.BUILD_TARGET === 'web') {
	web();
} else if (process.env.BUILD_TARGET === 'mobile') {
	mobile();
} else {
	build();
}