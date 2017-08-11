import { returnSVG } from './SVGMaker';

// initialize map
L.Mapzen.apiKey = 'search-waNZobx';
var map = L.Mapzen.map('map',{
  worldcopyjump: true,
  scrollZoom: false,
  minZoom: 2})
.setView([40.7142700, -74.0059700], 14);


L.Mapzen.hash({
  map: map
})

L.Mapzen.geocoder().addTo(map);

var areaSelect = L.areaSelect({width:200, height:250});

areaSelect.on("change", function() {
  var bounds = this.getBounds();

  document.getElementById('startLat').value = bounds.getNorthEast().lat.toFixed(4);
  document.getElementById('startLon').value = bounds.getNorthEast().lng.toFixed(4);

  document.getElementById('endLat').value = bounds.getSouthWest().lat.toFixed(4);
  document.getElementById('endLon').value = bounds.getSouthWest().lng.toFixed(4);
});

areaSelect.addTo(map);

var requestTileButton = document.getElementById('requestTiles');
var warningBox = document.getElementById('api-key-warning');
var statusBox = document.getElementById('status');

requestTileButton.addEventListener('click', function (e) {
  if (document.getElementById("api-key").value) {
    warningBox.style.display = 'none';
    statusBox.style.display = 'block';
    requestTileButton.disabled = true;
    returnSVG().then(function(result) {
      requestTileButton.disabled = false;
      statusBox.style.display = 'none';
    });
  } else {
    warningBox.style.display = 'block';
  }
});
