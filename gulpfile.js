const browserify = require('browserify');
const gulp = require('gulp');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const ts = require('gulp-typescript');
const tsify = require('tsify');
const uglify = require('gulp-uglify');

// const concat = require('gulp-concat');

gulp.task('default', () => {

    // set up the browserify instance on a task basis
    const b = browserify({
        entries: ['./server/server.ts'],
        node: true,
        debug: true
    });

    gulp.src('./server/config.json')
      .pipe(gulp.dest('./dist/'));

    /*gulp.src('./server/!**!/!*.ts')
        .pipe(ts({
            noImplicitAny: false,
            outFile: 'output.js'
        }))
        .pipe(gulp.dest('./dist/'));*/

    return b.external('./config.json')
        .plugin(tsify)
        .transform('babelify', {
            presets: ['es2017'],
            extensions: ['.ts']
        })
        .bundle()
        .pipe(source('app.js'))
        .pipe(buffer())
        //.pipe(uglify())
        .pipe(gulp.dest('./dist/'));
});
