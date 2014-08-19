var config = require('./config.js');

module.exports = function(grunt) {
  var srcFiles = [
    'lib/*.js',
    'models/*.js',
    'services/*.js',
    // frontend
    'web/dashboard/*.js',
    'web/lib/**/*.js',
    'web/iframe/*.js',
    'services/**',
    'util/**'
  ];
  var assetFiles = [
    'web/dashboard/*.html',
    'web/dashboard/*.css',
    'web/iframe/*.html'
  ];
  var testFiles = [
    'test/**/*js'
  ];

  grunt.initConfig({
    jshint: {
      files: srcFiles
    },
    watch: {
      assets: {
        files: assetFiles,
        tasks: ['includes'],
        options: {
          spawn: true
        },
      },
      src: {
        files: srcFiles,
        tasks: ['includes', 'browserify'],
        options: {
          spawn: true
        },
      },
      app: {
        files: ['config.js', 'app.js', 'index.js', 'lib/**'],
        tasks: ['develop'],
      },
      tests: {
        files: testFiles.concat(srcFiles),
        tasks: ['mochaTest:devUnitTest'],
        options: {
          spawn: true
        },
      },
    },
    browserify: {
      dashboard: {
        src: [ 'web/dashboard/index.js' ],
        dest: 'web/static/index.js',
        options: {
        }
      },
      iframe: {
        src: [ 'web/iframe/index-injected.js' ],
        dest: 'web/static/index-injected.js',
        options: {
        }
      },
    },
    includes: {
      files: {
        src: ['web/dashboard/dashboard.js', 'web/dashboard/index.html', 'web/iframe/injected-iframe.html', 'web/dashboard/dashboard.css'],
        dest: 'web/static',
        flatten: true,
        cwd: '.',
        options: {
          silent: false,
        }
      },
      iframe: {
        src: ['web/iframe/iframe.html'],
        dest: 'web/site',
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
          reporter: 'list',
          clearRequireCache: true
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
        exclude: ['node_modules', 'bower_components/**', 'static'],
        layout: 'linear'
      },
      main: {
        src: ['*.js', 'lib/*js', 'web/lib/*js', 'web/dashboard/*js', 'test/**/*.js']
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
         'bower_components/semantic-ui/build/packaged/css/semantic.css',
         'bower_components/select2/select2.css',
         'bower_components/jquery-ui/themes/ui-lightness/jquery-ui.css',
         'bower_components/jstree/dist/themes/default/style.min.css',
         'bower_components/slickgrid/slick.grid.css',
         'web/ext-libs/d3plus/d3plus.css',
         'web/ext-libs/nvd3/nv.d3.css',
         'web/ext-lib/jqCron/jqCron.css'
       ],
       dest: 'web/static/lib/libs.css'
      },
      js : {
        src : [
         'bower_components/jquery/dist/jquery.js',
         'bower_components/jquery-ui/ui/jquery-ui.js',
         'bower_components/jquery.event.drag-drop/event.drag/jquery.event.drag.js',
         'bower_components/jstree/dist/jstree.min.js',
         'bower_components/semantic-ui/build/packaged/javascript/semantic.js',
         'bower_components/select2/select2.js',
         'bower_components/slickgrid/slick.core.js',
         'bower_components/slickgrid/plugins/slick.cellrangedecorator.js',
         'bower_components/slickgrid/plugins/slick.cellrangeselector.js',
         'bower_components/slickgrid/plugins/slick.cellselectionmodel.js',
         'bower_components/slickgrid/slick.formatters.js',
         'bower_components/slickgrid/slick.editors.js',
         'bower_components/slickgrid/slick.grid.js',
         'web/ext-lib/tablesort.js',
         'web/ext-lib/dragFile.js',
         'web/ext-lib/d3plus/d3.js',
         'web/ext-lib/d3plus/d3plus.min.js',
         'web/ext-lib/nvd3/nv.d3.js',
         'web/ext-lib/jqCron/jqCron.js',
         'web/ext-lib/jqCron/jqCron.en.js'
        ],
        dest : 'web/static/lib/libs.min.js'
      }
    },
    execute: {
      clientids: {
        src: ['util/updateAgentClientIDs.js']
      },
      services : {
        src: ['services/service-manager.js']
      }
    },
    uglify : {
      js: {
        files: {
          'web/static/lib/libs.min.js' : [ 'web/static/lib/libs.min.js' ]
        }
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-develop');
  grunt.loadNpmTasks('grunt-includes');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-plato');
  grunt.loadNpmTasks('grunt-docker');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-execute');

  grunt.registerTask('default', ['includes', 'browserify', 'develop', 'watch', 'mochaTest:devUnitTest']);
  grunt.registerTask('test', ['mochaTest:devUnitTest', 'mochaTest:devIntegrationTest']);
  grunt.registerTask('tidy', ['jshint', 'plato']);
  grunt.registerTask('libs', [ 'concat:js', 'uglify:js', 'concat:css' ]);
  grunt.registerTask('clientids', [ 'execute:clientds']);
  grunt.registerTask('services', [ 'execute:services']);
};
