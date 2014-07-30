var config = require('./config.js');

module.exports = function(grunt) {
  var srcFiles = [
    'lib/*.js',
    'services/*.js',
    // frontend
    'contrib/__wm/*.js'
  ];

  grunt.initConfig({
    'string-replace': {
      domain: {
        files: {
          'static/__wm/' : ['static/__wm/*.js', 'static/__wm/*.html']
        },
        options: {
          replacements: [{
            pattern: /<!-- @var (.*?) -->/g,
            replacement: function (match, p1, offset, string) {
              console.log('string-replace', match, p1, rep);
              var rep = config.config[p1];
              if (!rep) {
                console.log('Missing ', p1, ' in config.js');
                throw 'Missing ' + p1 + ' in config.js';
              }
              return rep;
            }
          }]
        }
      }
    },

    jshint: {
      files: srcFiles
    },
    watch: {
      assets: {
        files: 'contrib/**/*.*',
        tasks: ['includes', 'browserify', 'string-replace'],
        options: {
          spawn: true
        },
      },
      app: {
        files: ['config.js', 'app.js', 'index.js', 'lib/**'],
        tasks: ['develop'],
      }
    },
    browserify: {
      standalone: {
        src: [ './contrib/__wm/index.js' ],
        dest: './static/__wm/index.js',
        options: {
        }
      },
    },
    includes: {
      files: {
        src: ['contrib/**/*.html'],
        dest: 'static/__wm',
        flatten: true,
        cwd: '.',
        options: {
          silent: false,
        }
      }
    },
    develop: {
      server: {
        file: 'app.js',
      }
    },
    mochaTest: {
      devUnitTest: {
        options: {
          reporter: 'list'
        },
        src: ['test/unit/*.js']
      },
      devIntegrationTest: {
        options: {
          reporter: 'list'
        },
        src: ['test/int/*.js']
      }
    },
    docker: {
      options: {
        exclude: ['node_modules', 'bower_components/**', 'static']
      },
      main: {
        src: ['*.js', 'lib/*js', 'contrib/__wm/*js', 'test/**/*.js']
      }
    },
    plato: {
      BaseProxy: {
        files: {
          'reports': srcFiles
        }
      }
    },
    concat: {
      css: {
       src: [
         'bower_components/semantic-ui/build/packaged/css/semantic.css', 'bower_components/select2/select2.css', 'bower_components/jquery-ui/themes/ui-lightness/jquery-ui.css', 'bower_components/jstree/dist/themes/default/style.min.css', 'static/__wm/lib/d3plus/d3plus.css', 'static/__wm/lib/nvd3/nv.d3.css', 'static/__wm/lib/jqCron/jqCron.css'

       ],
       dest: 'static/__wm/libs.css'
      },
      js : {
        src : [
         'bower_components/jquery/dist/jquery.js', 'static/__wm/lib/jquery.address.js', 'static/__wm/lib/tablesort.js', 'bower_components/jquery-ui/ui/jquery-ui.js', 'bower_components/jstree/dist/jstree.min.js', 'bower_components/semantic-ui/build/packaged/javascript/semantic.js', 'static/__wm/lib/dragFile.js', 'bower_components/select2/select2.js', 'static/__wm/lib/d3plus/d3.js', 'static/__wm/lib/d3plus/d3plus.min.js', 'static/__wm/lib/nvd3/nv.d3.js', 'static/__wm/lib/jqCron/jqCron.js'
        ],
        dest : 'static/__wm/libs.min.js'
      }
    },
    uglify : {
      js: {
        files: {
          'static/__wm/libs.min.js' : [ 'static/__wm/libs.min.js' ]
        }
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-develop');
  grunt.loadNpmTasks('grunt-includes');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-plato');
  grunt.loadNpmTasks('grunt-docker');
  grunt.loadNpmTasks('grunt-docker');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['includes', 'string-replace', 'browserify', 'develop', 'watch', 'mochaTest:devUnitTest']);
  grunt.registerTask('test', ['mochaTest:devUnitTest', 'mochaTest:devIntegrationTest']);
  grunt.registerTask('tidy', ['jshint', 'plato']);

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.registerTask('libs', [ 'concat:js', 'uglify:js', 'concat:css' ]);
};
