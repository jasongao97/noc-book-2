var fsx = require('fs-extra');
var path = require('path');
var through = require('through2');
var cheerio = require('cheerio');

// This constructor function will be called once per format
// for every build. It received a plugin registry object, which
// has .add(), .before() and .after() functions that can be used
// to register plugin functions in the pipeline.

var Plugin = function(registry){
  registry.after('markdown:convert', 'addP5:insert', this.addFrames);
  registry.add('addP5:copy', this.copyExamples);
};

Plugin.prototype = {

  copyExamples: function(config, stream, extras, cb) {
    var copyFrom = path.join(__dirname, '../examples');
    var copyTo = path.join(process.cwd(), extras.destination, "examples");

    fsx.copy(copyFrom, copyTo, function (err) {
      if (err) return console.error(err)
    });

    cb(null, config, stream, extras);
  },

  addFrames: function(config, stream, extras, cb) {
    if(config.format == "html") {

    stream = stream.pipe(through.obj(function(file, enc, cb) {
        if(!file.$el) file.$el = cheerio.load(file.contents.toString());
          // Loop through all figures to replace with iframes
          file.$el('figure[data-p5-sketch]').each(function(i, el) {
            var jel = file.$el(this);
            //<p class="caption">angleVel = 0.05</p>
            var path = jel.attr('data-p5-sketch');

            // Get height and width from element attributes
            // or use the default 640px * 360px
            var width = parseInt(jel.attr('data-p5-width')) || 640;
            var height = parseInt(jel.attr('data-p5-height')) || 360;

            var githubExampleLink = "https://github.com/nature-of-code/noc-examples-p5.js/tree/master/";
            var p5EditorLink = jel.attr('data-p5-editor-link');

            function p5Element(className) {
              return `<div class="${className} embedded-p5">
                <iframe style="max-width: 100%;" scrolling="no" src="examples/${path}" width="${width}" height="${height}" frameborder="0" allowfullscreen>
                </iframe>
                <div style="display: flex; margin-top: 12px;">
                  <a style="padding: 10px; background-color: rgb(235,0,90); color: white; border: none; text-decoration: none; font-family: 'ProximaNova-Bold';" href="${p5EditorLink}">Open in P5 Editor</a>
                  <a style="margin-left: 12px; padding: 10px; background: none; color: black; border: none; text-decoration: none; font-family: 'ProximaNova-Bold';" href="${githubExampleLink}${path}">View on Github</a>
                </div>
              </div>`;
            }

            if (jel.attr('class') && jel.attr('class').indexOf('two-col') > -1) {
              var newel = p5Element("two-col");
              if (jel.prev().attr('class') && jel.prev().attr('class').indexOf('two-col-wrapper') > -1) {
                jel.prev().find('div.two-col-container').append(newel);
              } else {
                jel.before('<div class="two-col-wrapper"><div class="two-col-container">' + newel + '</div></div>');
              }
            } else if (jel.attr('class') && jel.attr('class').indexOf('three-col') > -1) {
              var newel = p5Element("three-col");
              if (jel.prev().attr('class') && jel.prev().attr('class').indexOf('three-col-wrapper') > -1) {
                jel.prev().find('div.three-col-container').append(newel);
              } else {
                jel.before('<div class="three-col-wrapper"><div class="three-col-container">' + newel + '</div></div>');
              }
            } else {
              var newel = '<div class="one-col-wrapper">' + p5Element("one-col") + '</div>';
              jel.before(newel);
            }
            // check for a caption; if found, add to new element
            var caption = jel.find('figcaption');
            if (caption.length > 0 && /\S+/.test(caption.text())) {
              var prevframe = jel.prev().find('.embedded-p5').last();
              prevframe.after('<p class="caption">' + caption.html() + '</p>');
            }
            jel.empty();
            jel.remove();
          });

        // pass file through the chain
        cb(null, file);
      }))

    }

    cb(null, config, stream, extras);
  }

}

module.exports = Plugin;
