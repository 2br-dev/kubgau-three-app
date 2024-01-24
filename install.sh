clear;
yarn init;

mkdir -p src/html/data 
mkdir -p src/html/parts
mkdir -p src/scss/parts
mkdir -p src/scss/frameworks
mkdir -p src/scss/pages
mkdir -p src/ts/lib
mkdir -p release/img
mkdir -p release/css
mkdir -p release/fonts
mkdir -p release/js

tee .babelrc > /dev/null <<EOT

{
	"presets": [
		"@babel/preset-env",
		"@babel/preset-typescript"
	]
}
EOT

tee webpack.config.js > /dev/null << EOT
const { webpack, ProvidePlugin } = require("webpack");
const path = require('path');

module.exports = {
	devtool: 'inline-source-map',
	output: {
		path: path.resolve(__dirname, 'src'),
		filename: 'master.js'
	},
	mode: "development",
	resolve: {
		extensions: ['.ts', '.tsx', '.js']
	},
	module: {
		rules:[{
			test: /\.ts?$/,
			loader: 'babel-loader',
		}]
	},
	plugins: [
		new ProvidePlugin({
			$: "jquery",
			jQuery: "jquery",
			'window.$': 'jquery',
			'window.jQuery': 'jquery'
		})
	],
}
EOT

tee gulpfile.js > /dev/null <<EOT
//= ::::::::::::: DECLARATIONS::::::::::::::::::: =//

import gulp from 'gulp';

//= STYLES ==========================================
import nodeSass from 'node-sass';
import gulpSass from 'gulp-sass';
const sass = gulpSass(nodeSass);
import autoprefixer from 'gulp-autoprefixer';
import replace from 'gulp-replace';
import cssbeautify from 'gulp-cssbeautify';


//= JAVASCRIPT ======================================
import webpack from 'webpack-stream';
import config from './webpack.config.babel.cjs';


//= HTML ============================================
import include from 'gulp-file-include'
import beautify from 'gulp-html-beautify';
import browser from 'browser-sync';

const sync = browser.init({
	server: {
		baseDir: './release/'
	}
});


//= ::::::::::::::::::: TASKS :::::::::::::::::::: =//
//= Styles ===========================================
gulp.task('scss', () => {
	return gulp.src('./src/scss/**/*.scss')
		.pipe(sass({
			includePaths: ['node_modules']
		}))
		.pipe(autoprefixer())
		.pipe(replace('/img', '../img'))
		.pipe(cssbeautify())
		.pipe(gulp.dest('./release/css'))
		.pipe(sync.stream());
})

//= HTML =============================================
gulp.task('html', () => {
	return gulp.src('./src/html/*.html')
		.pipe(include())
		.pipe(beautify({
			indent_size: 2,
			indent_char: '\t'
		}))
		.pipe(gulp.dest('./release/'))
		.pipe(sync.stream())
})

//= JAVASCRIPT =======================================
gulp.task('java', () => {
	return gulp.src('./src/ts/master.ts')
		.pipe(webpack(config))
		.pipe(gulp.dest('release/js/'))
		.pipe(sync.stream())
});

//= WATCH ============================================
gulp.task('watch', () => {
	gulp.watch('./src/scss/**/*.scss', gulp.series('scss'));
	gulp.watch('./src/html/**/*.html', gulp.series('html'));
	gulp.watch('./src/ts/**/*.*', gulp.series('java'));
})

EOT

# core
yarn add --dev gulp browser-sync gulp-replace gulp-sourcemaps

# html
yarn add --dev gulp-file-include gulp-html-beautify

# styles
yarn add --dev gulp-sass node-sass gulp-autoprefixer gulp-cssbeautify

# scripts
yarn add --dev webpack webpack-stream @babel/core @babel/preset-env @babel/preset-typescript babel-loader

# extra
yarn add --dev materialize-css swiper vanilla-lazyload jquery

#types
yarn add --dev @types/node-sass @types/gulp-autoprefixer @types/webpack-stream @types/browser-sync @types/gulp-sass

touch ./src/html/index.html
touch ./src/scss/master.scss
touch ./src/ts/master.ts