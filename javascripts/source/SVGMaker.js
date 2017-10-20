'use strict';

import d3 from 'd3';

import { getTileSpec, getTileNumberToFetch, setupJson, getURL } from './TileUtil';

const DataLayer = require('./DataLayer');

const layers = Object.keys(DataLayer);

let conf;
let requestedTileSpec;

let dKinds;
let tilesToFetch

const getTiles = function () {
  requestedTileSpec = getTileSpec(document.getElementById('startLat').value, document.getElementById('endLat').value, document.getElementById('startLon').value, document.getElementById('endLon').value, document.getElementById('zoomLevel').value);

  conf = {
    key: document.getElementById("api-key").value,
    inkscape: document.getElementById('inkscape').checked,
    delayTime: 500,
    tileWidth: 100,
    outputLocation: 'svgmap'
  };

  dKinds = [];
  for (let item of layers) {
    if (document.getElementById(item).checked) dKinds.push(item);
  }

  console.log(requestedTileSpec);
  tilesToFetch = getTileNumberToFetch(requestedTileSpec.startTile, requestedTileSpec.endTile);
  console.log('Number of tiles to fetch : ' + tilesToFetch[0].length * tilesToFetch.length);
  console.log('Expected amount of time : ' + tilesToFetch[0].length * tilesToFetch.length * conf.delayTime/1000 + ' second');

  console.log('111');
  let tileUrlsToFetch = [];
  let jsonArray = [];
  for (let i = tilesToFetch.length-1; i >= 0; i--) {
    for (let j = tilesToFetch[0].length-1; j >= 0; j--) {
      tileUrlsToFetch.push(getURL(tilesToFetch[i][j].lon, tilesToFetch[i][j].lat, requestedTileSpec.zoom, conf.key));
    }
  }

  const getEachTile = (url) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.onload = () => resolve(JSON.parse(xhr.responseText));
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send();
    });

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms, 'dumb'));


return tileUrlsToFetch.reduce(function(promise, item, index, array) {
    return promise.then(values => {
      // Second promise was just to delay
      return Promise.all([getEachTile(item), delay(conf.delayTime)]).then((values)=> {
        jsonArray.push(values[0]);
        return jsonArray;
      });
    })
  }, Promise.resolve())
}


function getTrimmedObj (obj) {
  var newOBJ = {};
  for(var key in obj) {
    newOBJ[key] = {}
    for(var subKey in obj[key]) {
      if (obj[key][subKey].features.length > 0) {
        newOBJ[key][subKey] = obj[key][subKey];
      }
    }
  }
  return newOBJ;
}



function bakeJson(resultArray) {
  console.log('2222');
  return new Promise( function(resolve, reject,) {
    var geojsonToReform = setupJson(dKinds);
    // response geojson array
    for (let result of resultArray) {
      // inside of one object
      for (let response in result) {
        // if the property is one of dataKinds that user selected
        if (dKinds.indexOf(response) > -1) {
          let responseResult = result[response];
          for (let feature of responseResult.features) {
            var dataKindTitle = feature.properties.kind;
            if(geojsonToReform[response].hasOwnProperty(dataKindTitle)) {
              geojsonToReform[response][dataKindTitle].features.push(feature);
            } else {
              geojsonToReform[response]['etc'].features.push(feature)
            }
          }
        }
      }
    }
    var trimmedObj = getTrimmedObj(geojsonToReform);
    resolve(trimmedObj);
  })
}





function writeSVGFile(reformedJson) {
  console.log('333');
  return new Promise( function(resolve, reject,) {
    //d3 needs query selector from dom

        var svg = d3.select(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
                  .attr({
                    xmlns: 'http://www.w3.org/2000/svg',
                    width: conf.tileWidth * tilesToFetch[0].length,
                    height: conf.tileWidth* tilesToFetch.length
                  })

        var previewProjection = d3.geo.mercator()
                        .center([requestedTileSpec.startCoords.lon, requestedTileSpec.startCoords.lat])
                        //this are carved based on zoom 16, fit into 100px * 100px rect
                        .scale(600000* conf.tileWidth/57.5 * Math.pow(2,(requestedTileSpec.zoom-16)))
                        .precision(.0)
                        . translate([0, 0])

        var previewPath = d3.geo.path().projection(previewProjection);

        for (const dataK in reformedJson) {
          const oneDataKind = reformedJson[dataK];
          let g = svg.append('g')
          g.attr('id',dataK)

          for(const subKinds in oneDataKind) {
            const tempSubK = oneDataKind[subKinds]
            let subG = g.append('g')
            if (conf.inkscape) {
              subG.attr('id',subKinds)
                  .attr(":inkscape:groupmode","layer")
                  .attr(':inkscape:label', dataK+subKinds+'layer');
              }
            subG.attr('id',subKinds)
            for(const f in tempSubK.features) {
              const geoFeature = tempSubK.features[f]
              let previewFeature = previewPath(geoFeature);

              if(previewFeature && previewFeature.indexOf('a') > 0) ;
              else {
                subG.append('path')
                  .attr('d', previewFeature)
                  .attr('fill','none')
                  .attr('stroke','black')
              }
            }
          }
        }
        var finalSVG = svg.node().outerHTML;
        // Clean SVG for next round
        svg.remove();
        var outputLocation = 'svgmap'+ requestedTileSpec.startTile.lat +'-'+requestedTileSpec.startTile.lon +'-'+requestedTileSpec.zoom +'.svg';
        resolve(finalSVG);
  });
}


function enableDownloadLink (svg) {
  return new Promise( function(resolve, reject,) {
    let downloadA = document.getElementById('downloadSVG');
    downloadA.download = 'requested-map.svg';
    const blob = new Blob([svg], {type: 'text/xml'});
    const url = URL.createObjectURL(blob);
    downloadA.href = url;
    resolve(('done'));
  });
}

function returnSVG() {
  return getTiles()
    .then((result) => bakeJson(result))
    .then((result) => writeSVGFile(result))
    .then((resultSVG) => enableDownloadLink(resultSVG));
}

module.exports = { returnSVG };
