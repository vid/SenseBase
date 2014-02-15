var config = require('./config.js'); 

module.exports = function(grunt) {
  var srcFiles = [
    'lib/*.js',
    // frontend
    'static/__wm/*.js'
  ];

  grunt.initConfig({
    jshint: {
      files: srcFiles
    },
    watch: {
      html: {
        files: 'contrib/**/*.*',
        tasks: ['includes', 'string-replace'],
        options: {
          spawn: true,
          livereload: true
        },
      },
      app: {
        files: ['config.js', 'index.js', 'lib/**'],
        tasks: ['develop'],
      }
    },
    'string-replace': {
      domain: {
        files: {
          'static/__wm/' : ['static/__wm/*.js', 'static/__wm/*.html']
        },
        options: {
          replacements: [{
            pattern: /(DOMAIN|FAYEHOST|HOMEPAGE|ESEARCH_URI)/g,
            replacement: function (match, p1, offset, string) {
              var rep = config.config[match];
              if (!rep) {
                throw 'Missing ' + match + ' in config.js';
              }
              console.log('string-replace', match, p1, rep);
              return rep;
            }
          }]
        }
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
        file: 'index.js',
      }
    },
    forever: {
      options: {
        index: 'index.js',
      }
    },
    mochaTest: {
      configTest: {
        options: {
          reporter: 'spec',
        },
        src: ['test/configuration.js']
      },
      devUnitTest: {
        options: {
          reporter: 'spec'
        },
        src: ['test/*.js']
      }
    },
    docco: {
      docs: {
        src: srcFiles,
        dest: 'docs/annotated-source'
      }
    },
    plato: {
      BaseProxy: {
        files: {
          'reports': srcFiles
        }
      }
    },

  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-forever');
  grunt.loadNpmTasks('grunt-develop');
  grunt.loadNpmTasks('grunt-includes');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-docco2');
  grunt.loadNpmTasks('grunt-plato');

  grunt.registerTask('default', ['includes', 'string-replace', 'develop', 'watch', 'mochaTest']);
  grunt.registerTask('sanity-test', ['jshint', 'mochaTest:configTest', 'mochaTest:devUnitTest']);

};


