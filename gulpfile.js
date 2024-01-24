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
