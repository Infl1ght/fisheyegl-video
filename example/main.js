/* eslint-disable */

var distorter, example;

jQuery(document).ready(function($) {
  const video = document.querySelector('#video');
  document.addEventListener('keydown', (data) => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });

  distorter = FisheyeGl({
    glContext: document.querySelector('#canvas').getContext('webgl')
  });
  setInterval(() => {
    distorter.updateVideoFrame(video);
  }, 25);

  function onSliderChange() {
    readSliders();  
    distorter.applyDistortion();
    writeHash();
    updateDisplay();
  }
  $("dl").on("change", onSliderChange);
  $("dl input").on("mousemove", onSliderChange);

  readHash();
  setSliders();
  readSliders();  
  distorter.applyDistortion();
  updateDisplay();

  function updateDisplay() {
    $("#display .scale")[0].innerHTML = distorter.dist.scale;
    $("#display .k3")[0].innerHTML    = distorter.dist.k3;
    $("#display .k5")[0].innerHTML    = distorter.dist.k5;
    $("#display .k7")[0].innerHTML    = distorter.dist.k7;
    $("#display .zoom")[0].innerHTML    = distorter.dist.zoom;
    $("#display .zoomAnchorX")[0].innerHTML    = distorter.dist.zoomAnchor.x;
    $("#display .zoomAnchorY")[0].innerHTML    = distorter.dist.zoomAnchor.y;
    $("#display .shiftX")[0].innerHTML    = distorter.dist.shift.x;
    $("#display .shiftY")[0].innerHTML    = distorter.dist.shift.y;
  }

  function readSliders() {
    distorter.dist.scale = parseFloat($("#scale_label")[0].innerHTML = $("#scale").val());
    distorter.dist.k3    = parseFloat($("#k3").val());
    distorter.dist.k5    = parseFloat($("#k5").val());
    distorter.dist.k7    = parseFloat($("#k7").val());
    distorter.dist.zoom    = parseFloat($("#zoom").val());
    distorter.dist.zoomAnchor.x    = parseFloat($("#zoomAnchorX").val());
    distorter.dist.zoomAnchor.y    = parseFloat($("#zoomAnchorY").val());
    distorter.dist.shift.x    = parseFloat($("#shiftX").val());
    distorter.dist.shift.y    = parseFloat($("#shiftY").val());
  }

  function writeHash() {
    setUrlHashParameter("scale", distorter.dist.scale);
    setUrlHashParameter("k3",     distorter.dist.k3);
    setUrlHashParameter("k5",     distorter.dist.k5);
    setUrlHashParameter("k7",     distorter.dist.k7);
    setUrlHashParameter("zoom",     distorter.dist.zoom);
    setUrlHashParameter("zoomAnchorX",     distorter.dist.zoomAnchor.x);
    setUrlHashParameter("zoomAnchorY",     distorter.dist.zoomAnchor.y);
    setUrlHashParameter("shiftX",     distorter.dist.shift.x);
    setUrlHashParameter("shiftY",     distorter.dist.shift.y);
  }

  function readHash() { 
    distorter.dist.scale = parseFloat(getUrlHashParameter("scale")) || distorter.dist.scale;
    distorter.dist.k3      = parseFloat(getUrlHashParameter("k3"))     || distorter.dist.k3;
    distorter.dist.k5      = parseFloat(getUrlHashParameter("k5"))     || distorter.dist.k5; 
    distorter.dist.k7      = parseFloat(getUrlHashParameter("k7"))     || distorter.dist.k7; 
    distorter.dist.zoom      = parseFloat(getUrlHashParameter("zoom"))     || distorter.dist.zoom; 
    distorter.dist.zoomAnchor.x      = parseFloat(getUrlHashParameter("zoomAnchorX"))     || distorter.dist.zoomAnchor.x; 
    distorter.dist.zoomAnchor.y      = parseFloat(getUrlHashParameter("zoomAnchorY"))     || distorter.dist.zoomAnchor.y;
    distorter.dist.shift.x      = parseFloat(getUrlHashParameter("shiftX"))     || distorter.dist.shift.x; 
    distorter.dist.shift.y      = parseFloat(getUrlHashParameter("shiftY"))     || distorter.dist.shift.y; 
  }

  // not quite working:
  //$(window).on('hashchange', function() {
  //  readHash();
  //  adjustLens();
  //});

  function useHash(hashString) {
    window.location.hash = hashString;
    readHash();
    setSliders();
    updateDisplay();
    distorter.applyDistortion();
  }

  function setSliders() {
    $("#scale").val(distorter.dist.scale);
    $("#scale_label")[0].innerHTML = distorter.dist.scale;
    $("#k3").val(distorter.dist.k3);
    $("#k5").val(distorter.dist.k5);
    $("#k7").val(distorter.dist.k7);
    $("#zoom").val(distorter.dist.zoom);
    $("#zoomAnchorX").val(distorter.dist.zoomAnchor.x);
    $("#zoomAnchorY").val(distorter.dist.zoomAnchor.y);
    $("#shiftX").val(distorter.dist.shift.x);
    $("#shiftY").val(distorter.dist.shift.y);
  }


  // Drag & Drop behavior

  $('#canvas').on('dragenter',function(e) {
    $('.zone').addClass('hover');
  });

  $('#canvas').on('dragleave',function(e) {
    $('.zone').removeClass('hover');
  });

  var onDrop = function(e) {
    e.preventDefault();
    e.stopPropagation(); // stops the browser from redirecting.

    var files = e.dataTransfer.files;
    for (var i = 0, f; f = files[i]; i++) {
      // Read the File objects in this FileList.

      var reader = new FileReader();
      reader.onload = function(e) {
        var dataurl = distorter.getSrc();
//        var bin = atob(dataurl.split(',')[1]);
//        var exif = EXIF.readFromBinaryFile(new BinaryFile(bin));
//        console.log(exif);
        var uniq = (new Date()).getTime();
        $('#previous').prepend('<a target="_blank" class="' + uniq + '" href="' + dataurl + '"></a>');
        $('.' + uniq).append(distorter.getImage());
        distorter.setImage(event.target.result, function callback() {
          $('#grid').height($('#canvas').height());
          $('#grid').width($('#canvas').width());
        });

      }
      reader.readAsDataURL(f);

      // EXIF
      var exifReader = new FileReader();

      $('.exif').html('');
      exifReader.onload = function(e) {
        var exif = EXIF.readFromBinaryFile(e.target.result);
        $('.exif-camera').html(exif.Make + ', ' + exif.Model);
        $('.exif').html(JSON.stringify(exif));
      }
      exifReader.readAsArrayBuffer(f);
    }
  }

  function onDragOver(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  $('#canvas').on('dragover', onDragOver, false);
  $('#canvas')[0].addEventListener('drop', onDrop, false);


  window.onresize = resizeGrid;
  setTimeout(resizeGrid, 0);

  function resizeGrid() {
    $('#grid').height($('#canvas').height());
    $('#grid').width($('#canvas').width());
  }

  example = {
    useHash:       useHash,
    readHash:      readHash,
    writeHash:     writeHash,
    setSliders:    setSliders,
    readSliders:   readSliders,  
    updateDisplay: updateDisplay
  }

});
