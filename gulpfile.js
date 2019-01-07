const browserify = require('browserify');
const gulp = require('gulp');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const sourcemaps = require('gulp-sourcemaps');
const tsify = require('tsify');

gulp.task('default', () => {

    gulp.src('./server/config.json')
        .pipe(gulp.dest('./dist/'));

    return browserify({
        basedir: '.',
        debug: false,
        node: true,
        entries: ['server/server.ts'],
        cache: {},
        packageCache: {}
    })
        .external('./config.json')
        .plugin(tsify)
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest("dist"));
});
