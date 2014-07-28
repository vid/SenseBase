var config = require('./config.js');

//  "uglifyjs  --screw-ie8  bower-components/jquery/dist/jquery.js bower-components/faye/include.js bower-components/jstree/dist/jstree

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
        tasks: ['includes', 'string-replace'],
        options: {
          spawn: true
        },
      },
      app: {
        files: ['config.js', 'app.js', 'index.js', 'lib/**'],
        tasks: ['develop'],
      }
    },
    includes: {
      files: {
        src: ['contrib/**/*.*'],
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
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-develop');
  grunt.loadNpmTasks('grunt-includes');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-plato');
  grunt.loadNpmTasks('grunt-docker');

  grunt.registerTask('default', ['includes', 'string-replace', 'develop', 'watch', 'mochaTest:devUnitTest']);
  grunt.registerTask('test', ['mochaTest:devUnitTest', 'mochaTest:devIntegrationTest']);
  grunt.registerTask('tidy', ['jshint', 'plato']);

};


