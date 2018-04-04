var browserify = require('browserify');
const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

// const concat = require('gulp-concat');

gulp.task('default', () => {

    // set up the browserify instance on a task basis
    var b = browserify({
        entries: './server/server.js',
        node: true
    });

    return b.bundle()
        .pipe(source('app.js'))
        .pipe(buffer())
        .pipe(gulp.dest('./dist/'));
});
