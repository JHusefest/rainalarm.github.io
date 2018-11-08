
var baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});
//192.168.0.11:51015
var map = L.map('map', {
  center: [59.9288416666667, 10.600713888888902],
  zoom: 10,
  layers: [baseLayer],
  maxZoom: 18,
  minZoom: 4
});

L.easyButton("foo-bar", function(btn, map) {
    map.locate({setView: true, maxZoom: 16});
    map.on('locationfound', onLocationFound);
}).addTo(map);

function onLocationFound(e) {
    var radius = e.accuracy / 2;

    L.marker(e.latlng).addTo(map)
        .bindPopup("You are within " + radius + " meters from this point").openPopup();

    L.circle(e.latlng, radius).addTo(map);
}

var baseMaps = {
    "OpenStreetMap": baseLayer
};

map.on('moveend', function(a) {
  getPlaces();
  //yrCall();
});

function getPlaces() {

    var bounds = map.getBounds();
    //console.log(bounds);
    var nordLL = bounds._southWest.lat;
    var nordUR = bounds._northEast.lat;
    var ostLL = bounds._southWest.lng;
    var ostUR = bounds._northEast.lng;

    jQuery.get({
      url: "https://ws.geonorge.no/SKWS3Index/ssr/sok?nordLL="+nordLL+"&ostLL="+ostLL+"&nordUR="+nordUR+"&ostUR="+ostUR+"&epsgKode=4326",
      //success: onSuccess,
      dataType: "xml",
      error: function(response, status, errorThrown) {
      console.log(errorThrown);
      }
    }).then(function(xmlData) {
      lists = onSuccess(xmlData);
      return lists;
    }).then(function(lists) {
      var jsonlist = lists[0];
      //console.log(jsonlist);
      //console.log(jsonlist);
      var yrCalls = lists[1];
      //remo = removeErr(yrCalls);
      //console.log(yrCalls);
      makeYr(jsonlist, yrCalls);
    });
  }

function onSuccess(xmlData) {

  var totaltAntTreff = xmlData.firstChild.children[1].textContent;
  var stedsnavnData = xmlData.firstChild.children

  var jsonlist = [];
  var distarray = [];
  var urls = [];
  var weather = {};
  var json = [];
  var forecast;

  for (var i = 0, j = 0; i < stedsnavnData.length; i++) {
      //console.log(stedsnavnData[i].children.innerHTML);
      var singleSted = stedsnavnData[i];

      if(singleSted.localName === "stedsnavn") {
        var stedsnavn;// = singleSted.getElementsByTagName("stedsnavn").innerHTML;
        var aust;// = singleSted.getElementsByTagName("aust").innerHTML;
        var nord;// = singleSted.getElementsByTagName("nord").innerHTML;

        for(var k = 0; k < singleSted.children.length; k++) {
          var stedChild = singleSted.children[k];

          if(stedChild.localName === "stedsnavn") {
            stedsnavn = stedChild.innerHTML;
          }
          if(stedChild.localName === "aust") {
            aust = stedChild.innerHTML;
          }
          if(stedChild.localName === "nord") {
            nord = stedChild.innerHTML;
          }
          if(stedChild.localName === "fylkesnavn") {
            fylkesnavn = stedChild.innerHTML;
          }

          if(stedChild.localName === "kommunenavn") {
            kommunenavn = stedChild.innerHTML;
          }

          if(stedChild.localName === "navnetype") {
            navnetype = stedChild.innerHTML;
          }

        }
        //console.log(kommunenavn);

        var json = {"sted":stedsnavn,"nord":Number(nord),"aust":Number(aust),"fylkesnavn":fylkesnavn,"kommunenavn":kommunenavn,"navnetype":navnetype,"ID":j,"Precipitation":-1,"Time":"", "Rain":-1};
        //var url = "http://localhost:8080/sted/Norge/" + fylkesnavn + "/" + kommunenavn + "/" + stedsnavn + "/varsel_nu.xml";
        //console.log(url);


        //var options = {
        //  url: url_yr,
        //  type: "GET",
        //  dataType: 'xml',
        //}

        var urls_temp = $.get({
          url: "https://cors.io/?http://www.yr.no/sted/Norge/" + fylkesnavn + "/" + kommunenavn + "/" + stedsnavn + "/varsel_nu.xml",
          type: "GET",
          dataType: 'xml',
        }).catch(function(e) {
          //console.log(e.status);
        });

        urls.push(urls_temp);

        jsonlist[j] = json;
        j++;

      }

    }

    var yrCalls = defCalls(urls);

    return [jsonlist, yrCalls];
  }

  function checkURL(url) {
    var yrCalls = defCalls(url);
  }

  function defCalls(requests) {
    //console.log(requests);
    var def = $.Deferred();

    $.when.apply($, requests).always(function(e) {
      def.resolve(arguments);
    });

    return def.promise();
  }

  function makeGeojson(jsonlist) {
    return GeoJSON.parse(jsonlist, {Point: ['nord', 'aust'], include: ['sted', 'ID', 'Precipitation', 'Rain', 'time']});
  }

  map.on('move', function(a) {
    map.eachLayer(function(layer) {
      if (layer._url !== "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png") {
        map.removeLayer(layer);
      }
    });
  });

    function getColorRain(stype) {

      switch (stype) {
        case true:
          return 'blue';
        case false:
          return "#ff7800";
        default:
          return "black";
      }
    }

    function getColorNavnetype(stype) {
         switch (stype) {
           case 'By':
             return  'orange';
           case 'Tettsted':
             return 'green';
           case 'Kirke':
             return 'blue';
           case 'Kommune':
             return 'purple';
           case 'Tettbebyggelse':
             return 'blue';
           case 'Bru':
             return '#FF00FF'
           case 'Grend':
             return '#20B2AA'
           case 'Bydel':
             return 'black'
           case 'Bygdelag (bygd)':
             return '#CD853F'
           case 'Skole':
             return 'Skole'
           case 'Nes':
             return '#FFE4B5'
            default:
             return '#B0E0E6';
         }
       }

function onYrSuccess(jqXHR, feature) {
    var newgeojson = [];
    var forecast = '';
    //console.log(feature);
  	try  {
  		var rootElement = jqXHR.firstChild;
  		var forecastElement = rootElement.getElementsByTagName("forecast")[0];

  		for(var i = 0; i < forecastElement.children.length; i++) {
  			var timeElement = forecastElement.children[i];
  			var precipitationElement = timeElement.getElementsByTagName("precipitation")[0];
  			var precipitation = Number(precipitationElement.getAttribute("value"));

        if (precipitation > 0) {
          //console.log(precipitation);
          forecast = {"time":timeElement.getAttribute("from"), "Precipitation":precipitation, "sted":feature.sted, "ID":feature.ID, "Rain":true, "aust":feature.aust, "nord":feature.nord, "navnetype":feature.navnetype};
          break

        } else {
          forecast = {"time":timeElement.getAttribute("from"), "Precipitation":precipitation, "sted":feature.sted, "ID":feature.ID, "Rain":false, "aust":feature.aust, "nord":feature.nord, "navnetype":feature.navnetype};
          continue;
        }
  		}

  	} catch(error) {
      forecast = ""; //{"time":"Unknown", "Precipitation":"Unknown", "sted":feature.sted, "ID":feature.ID, "Rain":3, "aust":feature.aust, "nord":feature.nord, "navnetype":feature.navnetype};
  	} finally {
      return forecast;
    }
  }

  function displayGeojson(geojson) {
    L.geoJSON(geojson, {
    filter: function (feature, latlng) {
      return feature; //.properties.Rain == true;
    },

    pointToLayer: function (feature, latlng) {
      //console.log(feature);
      return L.circleMarker(latlng, {

      radius: 8,
      fillColor: getColorRain(feature.properties.Rain),
      color: 'black',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8

    }).bindPopup(JSON.stringify(feature.properties.Precipitation)+"mm at "+feature.properties.sted+" at "+feature.properties.time);
  }
      }).addTo(map);
  }

  function makeYr(jsonlist, yrCall) {
    var varselArray = [];
    yrCall.then(function(arr) {
      //console.log(arr);
      $.each(arr, function(e) {
        //console.log(JSON.stringify(arr[e]));
        if (arr[e] !== undefined) {
          var vervarsel = onYrSuccess(arr[e][0], jsonlist[e]);
          //console.log('no rain forecast');
        if (vervarsel != "") {
          varselArray.push(vervarsel);
          }
        } else {
          varselArray.push(jsonlist[e]);
        }
      });
      return varselArray;
    }).then(function(e) {
      return makeGeojson(e);
    }).then(function(geojson) {
      displayGeojson(geojson);
    });
  }
