const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');
const ts = require('gulp-typescript');
const tsProject = ts.createProject("tsconfig.json");
const srctDir = path.resolve(__dirname, 'src');
const distDir = path.resolve(__dirname, 'dist');

gulp.task('clean', function(cb) {
  if (fs.existsSync(distDir)) {
    return del([distDir], cb);
  }
  return cb();
});

gulp.task('typescript', function() {
  const tsPath = path.join(srctDir, '/**/*.ts');
  return gulp.src(tsPath)
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(tsProject())
  .pipe(sourcemaps.write())
  .pipe(gulp.dest(distDir));
});

gulp.task('copy', function() {
  const paths = ['json', 'js'].map(function(_path) {
    return path.join(srctDir, `/**/*.${_path}`);
  });
  return gulp.src(paths)
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(babel({
    presets: ['@babel/env']
  }))
  .pipe(sourcemaps.write())
  .pipe(gulp.dest(distDir));
});

gulp.task('uglify', function() {
  const jsPath = path.join(distDir, '/**/*.js');
  return gulp.src(jsPath)
  .pipe(uglify())
  .pipe(gulp.dest(distDir));
});


gulp.task('dist', gulp.series('clean', 'typescript', 'copy', 'uglify'));

gulp.task('watch', function() {
  const watchingPath = path.join(srctDir, '/**/*');
  const watcher = gulp.watch(watchingPath, gulp.series('typescript', 'copy'));
  watcher.on('change', function(event) {
    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
  });
});
