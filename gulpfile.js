const browserify = require('browserify');
const gulp = require('gulp');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');

// const concat = require('gulp-concat');

gulp.task('default', () => {

    // set up the browserify instance on a task basis
    const b = browserify({
        entries: './server/server.js',
        node: true,
        debug: false
    });

    gulp.src('./server/config.json')
      .pipe(gulp.dest('./dist/'));

    return b.external('./config.json').bundle()
        .pipe(source('app.js'))
        .pipe(buffer())
        .pipe(gulp.dest('./dist/'));
});
