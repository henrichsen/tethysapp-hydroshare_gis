/*(function packageHydroShareGIS() {
/*
    'use strict';

    /*****************************************************************************************
     *********************************** GLOBAL VARIABLES ************************************
     *****************************************************************************************/

    var map;
    var mapLayers = {};


    /*****************************************************************************************
     *********************************** GLOBAL RESOURCES ************************************
     *****************************************************************************************/

    var symbologyFunctions = {
        applyColorMap: function(pixels, data) {
            var pixel = pixels[0];
            var value = pixel[1] / 255
            var colormap = data['colorMap']

            var inRange = function(e) {
                return e >= value
            };

            var colorIndex = colormap['positions'].findIndex(inRange)
            if (colorIndex === 0) {
                colorIndex = 1
            };

            var position1 = colormap['positions'][colorIndex - 1]
            var position2 = colormap['positions'][colorIndex]
            var factor = (value - position1) / (position2 - position1)
            var color1 = colormap['colors'][colorIndex - 1]
            var color2 = colormap['colors'][colorIndex]

            var mappedColor = color1.slice();
            for (var i=0;i<3;i++) {
                mappedColor[i] = Math.round(mappedColor[i] + factor*(color2[i]-color1[i]));
            };

            pixel[0] = mappedColor[0]
            pixel[1] = mappedColor[1]
            pixel[2] = mappedColor[2]

            return pixel;
        },
        applySingleColor: function(pixels, data) {
            pixel = pixels[0];
            color = data['color'];
            pixel[0] = color[0];
            pixel[1] = color[1];
            pixel[2] = color[2];
            return pixel;
        },
        applyColorIntervals: function(pixels, data) {
            pixel = pixels[0];
            return pixel;
        },
        applyThresholdSymbology: function(pixels, data) {
            var pixel = pixels[0];
            var value = pixel[1] / 255
            var thresholdColor = data['thresholdColor']
            var invert = data['thresholdInvert']
            var maxValue = data['maxValue']
            var minValue = data['minValue']
            var upperThreshold = (data['upperThreshold'] - minValue) / maxValue
            var lowerThreshold = (data['lowerThreshold'] - minValue) / maxValue
            if (invert = false) {
                if (value <= upperThreshold && value >= lowerThreshold) {
                    pixel[0] = thresholdColor[0]
                    pixel[1] = thresholdColor[1]
                    pixel[2] = thresholdColor[2]
                } else {
                    pixel[3] = 0
                }
            } else {
                if (value >= upperThreshold || value <= lowerThreshold) {
                    pixel[0] = thresholdColor[0]
                    pixel[1] = thresholdColor[1]
                    pixel[2] = thresholdColor[2]
                } else {
                    pixel[3] = 0
                };
            };
        }
    };

    var colorMaps = {
        rainbow: {
            colors: [[150, 0, 90], [0, 0, 200], [0, 25, 255], [0, 152, 255], [44, 255, 150], [151, 255, 0], [255, 234, 0], [255, 111, 0], [255, 0, 0]],
            positions: [0, .125, .25, .375, .5, .625, .75, .875, 1]
        },
        viridis: {
            colors: [[68,1,84], [71,44,122], [59,81,139], [44,113,142], [33,144,141], [39,173,129], [92,200,99], [170,220,50], [253,231,37]],
            positions: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]
        },
        jet: {
            colors: [[0,0,131], [0,60,170], [5,255,255], [255,255,0], [250,0,0], [128,0,0]],
            positions: [0, 0.125, 0.375, 0.625, 0.875, 1]
        },
        hot: {
            colors: [[0,0,0], [230,0,0], [255,210,0], [255,255,255]],
            positions: [0, 0.333, 0.666, 1]
        },
        cool: {
            colors: [[0,255,255], [255,0,255]],
            positions: [0, 1]
        },
        magma: {
            colors: [[0,0,4], [28,16,68], [79,18,123], [129,37,129], [181,54,122], [229,80,100], [251,135,97], [254,194,135], [252,253,191]],
            positions: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]
        },
        plasma: {
            colors: [[13,8,135], [75,3,161], [125,3,168], [168,34,150], [203,70,121], [229,107,93], [248,148,65], [253,195,40], [240,249,33]],
            positions: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]
        },
        spring: {
            colors: [[255, 0, 255], [255, 255, 0]],
            positions: [0, 1]
        },
        electric: {
            colors: [[0, 0, 0], [30, 0, 100], [120, 0, 100], [160, 90, 0], [230, 200, 0], [255, 250, 220]],
            positions: [0, .15, .4, .6, .8, 1]
        },
        blackbody: {
            colors: [[0, 0, 0], [230, 0, 0], [230, 210, 0], [255, 255, 255], [160, 200, 255]],
            positions: [0, .2, .4, .7, 1]
        },
        summer: {
            colors: [[0, 128, 102], [255, 255, 102]],
            positions: [0, 1]
        },
        autumn: {
            colors: [[255, 0, 0], [255, 255, 0]],
            positions: [0, 1]
        },
        winter: {
            colors: [[0, 0, 255], [0, 255, 128]],
            positions: [0, 1]
        },
        bone: {
            colors: [[0, 0, 0], [84, 84, 116], [169, 200, 200], [255, 255, 255]],
            positions: [0, .376, .753, 1]
        },
        gray: {
            colors: [[0, 0, 0], [255, 255, 255]],
            positions: [0, 1]
        },
    };

    /******************************************************
     ************* FUNCTION DECLARATIONS ******************
     ******************************************************/

    var mapInit;
    var mapReorderLayers;
    var mapAddLayer;
    var mapUpdateLayerStyling;
    var mapToggleLayer;
    var mapLayerSymbology;


    /******************************************************
     ****************** FUNCTIONS *************************
     ******************************************************/

    mapInit = function() {
        var satellite_base_map = new ol.layer.Tile({
            source: new ol.source.BingMaps({
                key: 'eLVu8tDRPeQqmBlKAjcw~82nOqZJe2EpKmqd-kQrSmg~AocUZ43djJ-hMBHQdYDyMbT-Enfsk0mtUIGws1WeDuOvjY4EXCH-9OK3edNLDgkc',
                imagerySet: 'AerialWithLabels',
            })
        });

        map = new ol.Map({
            target: 'map',
            controls : ol.control.defaults({
                attribution : false,
            }),
            view: new ol.View({
                center: ol.proj.transform([0, 0], 'EPSG:4326', 'EPSG:3857'),
                zoom: 1.8,
                minZoom: 1.8,
                maxZoom: 19
            }),
            layers: [satellite_base_map]
        });

        setTimeout(function() {map.updateSize();}, 150);

    };

    mapAddLayer = function(data) {

        symbologyControls = {
            'polygon':`
                <br>
                <div>
                    <label>Fill Color:<input comp="fill" type="text" class="polygon-fill-color"/></label>
                    <br>
                    <label>Border Color:<input comp="stroke" type="text" class="polygon-border-color"/></label>
                    <br>
                    <label>Border Thickness:
                        <select class="polygon-border-thickness">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="16">16</option>
                            <option value="18">18</option>
                        </select>
                    </label>
                </div>
                <br>
                <button class="exit-symbology-button">Done</button>
            `,
            'point':`
                <br>
                <div>
                    <label>Fill Color:<input type="text" class="point-fill-color"/></label>
                    <br>
                    <label>Point Size:
                        <select class="point-size">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="16">16</option>
                            <option value="18">18</option>
                        </select>
                    </label>
                    <br>
                    <label>Point Shape:
                        <select class="point-shape">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="16">16</option>
                            <option value="18">18</option>
                        </select>
                    </label>
                    <br>
                    <label>BorderColor:<input type="text" class="point-border-color"/></label>
                    <br>
                    <label>Border Thickness:
                        <select class="point-border-thickness">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="16">16</option>
                            <option value="18">18</option>
                        </select>
                    </label>
                </div>
                <br>
                <button class="exit-symbology-button">Done</button>
            `,
            'line':`
                <br>
                <div>
                    <label>Line Color:<input comp="stroke" type="text" class="line-color"/></label>
                    <br>
                    <label>Line Thickness:
                        <select class="line-thickness">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="16">16</option>
                            <option value="18">18</option>
                        </select>
                    </label>
                </div>
                <br>
                <button class="exit-symbology-button">Done</button>
            `,
            'raster':`
                <br>
                <div>
                    <label>Color Map:
                        <select class="raster-colormap-select">
                            <option value="gray">Gray</option>
                            <option value="rainbow">Rainbow</option>
                            <option value="electric">Electric</option>
                            <option value="bone">Bone</option>
                            <option value="blackbody">Blackbody</option>
                            <option value="viridis">Viridis</option>
                            <option value="jet">Jet</option>  
                            <option value="hot">Hot</option>
                            <option value="cool">Cool</option>
                            <option value="magma">Magma</option>
                            <option value="plasma">Plasma</option>   
                            <option value="spring">Spring</option>
                            <option value="summer">Summer</option>
                            <option value="autumn">Autumn</option>
                            <option value="winter">Winter</option>
                        </select>
                    </label>
                </div>
                <br>
                <button class="exit-symbology-button">Done</button>
            `
        };

        layerObjects = {
            'polygon': {
                'type': 'polygon',
                'layer': {
                    'fill': {
                        'layerSource': {},
                        'imageSource': {},
                        'rasterSource': {},
                        'zIndex': 0,
                        'symbologyData': {
                            'function': 'applySingleColor',
                            'color': [220, 220, 220],
                            'opacity': 1,
                            'visible': true
                        }
                    },
                    'stroke': {
                        'layerSource': {},
                        'imageSource': {},
                        'rasterSource': {},
                        'zIndex': 1,
                        'symbologyData': {
                            'function': 'applySingleColor',
                            'color': [0,0,0],
                            'width': 1,
                            'opacity': 1,
                            'visible': true

                        }
                    },
                    'label': {
                        'layerSource': {},
                        'imageSource': {},
                        'rasterSource': {},
                        'zIndex': 2,
                        'symbologyData': {
                            'function': 'applySingleColor',
                            'color': [0, 0, 0],
                            'fontFamily': 'Arial',
                            'fontSize': 12,
                            'propertyName': 'NAME',
                            'opacity': 1,
                            'visible': false
                        }
                    }
                }
            },
            'line': {
                'type': 'line',
                'layer': {
                    'stroke': {
                        'layerSource': {},
                        'imageSource': {},
                        'rasterSource': {},
                        'zIndex': 0,
                        'symbologyData': {
                            'function': 'applySingleColor',
                            'color': [0, 0, 0],
                            'width': 1,
                            'opacity': 1,
                            'visible': true
                        }
                    }
                }
            },
            'raster': {
                'type': 'raster',
                'layer': {
                    'raster': {
                        'imageSource': {},
                        'rasterSource': {},
                        'zIndex': 0,
                        'symbologyData': {
                            'function': 'applyColorMap',
                            'colorMap': 'gray',
                            'opacity': 1,
                            'visible': true
                        }
                    }
                }
            }
        }

        layerType = data['layer_type'];
        layerWorkspace = data['workspace'];
        layerCode = data['layer_code'];

        if (layerType === 'linestring') {
            layerType = 'line'
        }

        if (layerType === 'multipolygon') {
            layerType = 'polygon'
        }

        console.log(layerType)

        mapLayers[layerCode] = layerObjects[layerType]

        for (var layerComponent in mapLayers[layerCode]['layer']) {

            if (layerType === 'raster') {
                mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['rasterMax'] = data['layer_data']['raster_max']
                mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['rasterMin'] = data['layer_data']['raster_min']
                mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['rasterNdv'] = data['layer_data']['raster_ndv']
            }

            sldData = {
                'layerWorkspace': layerWorkspace,
                'layerCode': layerCode,
                'layerType': layerType,
                'layerComponent': layerComponent,
                'params': mapLayers[layerCode]['layer'][layerComponent]['symbologyData']
            }

            sldBody = getSLDString(sldData)

            geoserverUrl = $('#geoserver-endpoint').text() + '/wms'

            mapLayers[layerCode]['layer'][layerComponent]['layerSource'] = new ol.source.ImageWMS({
                url: geoserverUrl,
                params: {'LAYERS': layerWorkspace + ':' + layerCode, 'SLD_BODY': sldBody},
                serverType: 'geoserver',
                crossOrigin: 'Anonymous'
            });

            mapLayers[layerCode]['layer'][layerComponent]['rasterSource'] = new ol.source.Raster({
                sources: [mapLayers[layerCode]['layer'][layerComponent]['layerSource']],
                operation: function(pixels, data) {
                    pixel = symbologyFunction(pixels, data);
                    return pixel
                },
                lib: {
                    symbologyFunction: symbologyFunctions[mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['function']]
                }
            });

            mapLayers[layerCode]['layer'][layerComponent]['rasterSource'].layerComponent = layerComponent
            mapLayers[layerCode]['layer'][layerComponent]['rasterSource'].layerCode = layerCode

            mapLayers[layerCode]['layer'][layerComponent]['rasterSource'].on('beforeoperations', function(event) {
                var data = event.data
                if (mapLayers[event.target.layerCode]['layer'][event.target.layerComponent]['symbologyData']['function'] === 'applySingleColor') {
                    data['color'] = mapLayers[event.target.layerCode]['layer'][event.target.layerComponent]['symbologyData']['color']

                };
                if (mapLayers[event.target.layerCode]['layer'][event.target.layerComponent]['symbologyData']['function'] === 'applyColorMap') {
                    data['colorMap'] = colorMaps[mapLayers[event.target.layerCode]['layer'][event.target.layerComponent]['symbologyData']['colorMap']] 
                };
            });

            mapLayers[layerCode]['layer'][layerComponent]['imageSource'] = new ol.layer.Image({
                source: mapLayers[layerCode]['layer'][layerComponent]['rasterSource']
            });

            mapLayers[layerCode]['layer'][layerComponent]['imageSource'].setVisible(mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['visible'])
            mapLayers[layerCode]['layer'][layerComponent]['imageSource'].setOpacity(mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['opacity'])
            map.addLayer(mapLayers[layerCode]['layer'][layerComponent]['imageSource']);
        };

        $('#' + layerCode).find('img').attr('src', '/static/hydroshare_gis/images/geographicfeatureicon.png')
        $('#' + layerCode).find('.layer-symbology-container').eq(0).html(symbologyControls[layerType]) 

        if (layerType === 'polygon') {
            addColorPicker('.polygon-fill-color', mapLayers[layerCode]['layer']['fill']['symbologyData']['color']);
            addColorPicker('.polygon-border-color', mapLayers[layerCode]['layer']['stroke']['symbologyData']['color']);
        }

        if (layerType === 'line') {
            addColorPicker('.line-color', mapLayers[layerCode]['layer']['stroke']['symbologyData']['color']);
        }

        return

    };

    updateLayerSLD = function(data) {

    }

    getSLDString = function(data) {
        layerType = data['layerType'];
        layerWorkspace = data['layerWorkspace'];
        layerCode = data['layerCode'];
        layerComponent = data['layerComponent'];
        if (layerType === 'point') {
            pointShape = data['pointShape'];
            pointSize = data['pointSize'];
            strokeWidth = data['strokeWidth'];
            sldString = `
                <?xml version="1.0" encoding="ISO-8859-1"?>
                <StyledLayerDescriptor version="1.0.0" 
                 xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" 
                 xmlns="http://www.opengis.net/sld" 
                 xmlns:ogc="http://www.opengis.net/ogc" 
                 xmlns:xlink="http://www.w3.org/1999/xlink" 
                 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
                    <NamedLayer>
                        <Name>${layerWorkspace}:${layerCode}</Name>
                        <UserStyle>
                            <FeatureTypeStyle>
                                <Rule>
                                    <PointSymbolizer>
                                        <Graphic>
                                            <Mark>
                                                <WellKnownName>${pointShape}</WellKnownName>
                                                <Fill>
                                                    <CssParameter name="fill">#FFFFFF</CssParameter>
                                                </Fill>
                                                <Stroke>
                                                    <CssParameter name="stroke">#FF0000</CssParameter>
                                                    <CssParameter name="stroke-width">${strokeWidth}</CssParameter>
                                                    <CssParameter name="stroke-linecap">round</CssParameter>
                                                    <CssParameter name="stroke-linejoin">round</CssParameter>
                                                </Stroke>
                                            </Mark>
                                            <Size>${pointSize}</Size>
                                        </Graphic>
                                    </PointSymbolizer>
                                </Rule>
                            </FeatureTypeStyle>
                        </UserStyle>
                    </NamedLayer>
                </StyledLayerDescriptor>
            `;
        };
        if (layerType === 'line') {
            if (layerComponent === 'stroke') {
                strokeWidth = data['params']['width'];
                sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
                            '<StyledLayerDescriptor version="1.0.0" ' +
                            'xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" ' +
                            'xmlns="http://www.opengis.net/sld" ' +
                            'xmlns:ogc="http://www.opengis.net/ogc" ' +
                            'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
                            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                                '<NamedLayer>' +
                                    '<Name>' + layerWorkspace + ':' + layerCode + '</Name>' +
                                    '<UserStyle>' +
                                        '<FeatureTypeStyle>' +
                                            '<Rule>' +
                                                '<LineSymbolizer>' +
                                                    '<Stroke>' +
                                                        '<CssParameter name="stroke">#000000</CssParameter>' +
                                                        '<CssParameter name="stroke-width">' + strokeWidth + '</CssParameter>' +
                                                        '<CssParameter name="stroke-linecap">round</CssParameter>' +
                                                        '<CssParameter name="stroke-linejoin">round</CssParameter>' +
                                                    '</Stroke>' +
                                                '</LineSymbolizer>' +
                                            '</Rule>' +
                                        '</FeatureTypeStyle>' +
                                    '</UserStyle>' +
                                '</NamedLayer>' +
                            '</StyledLayerDescriptor>';
                console.log(sldString)
            };
        };
        if (layerType === 'polygon') {
            if (layerComponent === 'fill') {
                sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
                            '<StyledLayerDescriptor version="1.0.0" ' +
                            'xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" ' +
                            'xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" ' +
                            'xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                                '<NamedLayer>' +
                                    '<Name>' + layerWorkspace + ':' + layerCode + '</Name>' +
                                    '<UserStyle>' +
                                        '<FeatureTypeStyle>' +
                                            '<Rule>' +
                                                '<PolygonSymbolizer>' +
                                                    '<Fill>' +
                                                        '<CssParameter name="fill">#FFFFFF</CssParameter>' +
                                                    '</Fill>' +
                                                '</PolygonSymbolizer>' +
                                            '</Rule>' +
                                        '</FeatureTypeStyle>' +
                                    '</UserStyle>' +
                                '</NamedLayer>' +
                            '</StyledLayerDescriptor>';
            };
            if (layerComponent === 'stroke') {
                strokeWidth = data['params']['width'];
                sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
                            '<StyledLayerDescriptor version="1.0.0" ' +
                            'xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" ' +
                            'xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" ' +
                            'xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                                '<NamedLayer>' +
                                    '<Name>' + layerWorkspace + ':' + layerCode + '</Name>' +
                                    '<UserStyle>' +
                                        '<FeatureTypeStyle>' +
                                            '<Rule>' +
                                                '<PolygonSymbolizer>' +
                                                    '<Stroke>' +
                                                        '<CssParameter name="stroke">#FF0000</CssParameter>' +
                                                        '<CssParameter name="stroke-width">' + strokeWidth + '</CssParameter>' +
                                                        '<CssParameter name="stroke-linecap">round</CssParameter>' +
                                                        '<CssParameter name="stroke-linejoin">round</CssParameter>' +
                                                    '</Stroke>' +
                                                '</PolygonSymbolizer>' +
                                            '</Rule>' +
                                        '</FeatureTypeStyle>' +
                                    '</UserStyle>' +
                                '</NamedLayer>' +
                            '</StyledLayerDescriptor>';
            };
            if (layerComponent === 'label') {
                propertyName = data['params']['propertyName'];
                fontFamily = data['params']['fontFamily'];
                fontSize = data['params']['fontSize'];
                sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
                            '<StyledLayerDescriptor version="1.0.0" ' +
                            'xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" ' +
                            'xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" ' +
                            'xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                                '<NamedLayer>' +
                                    '<Name>' + layerWorkspace + ':' + layerCode + '</Name>' +
                                    '<UserStyle>' +
                                        '<FeatureTypeStyle>' +
                                            '<Rule>' +
                                                '<TextSymbolizer>' +
                                                    '<Label>' + 
                                                        '<ogc:PropertyName>' + propertyName + '</ogc:PropertyName>' +
                                                    '</Label>' +
                                                    '<Font>' +
                                                        '<CssParameter name="font-family">' + fontFamily + '</CssParameter>' +
                                                        '<CssParameter name="font-size">' + fontSize + '</CssParameter>' +
                                                    '</Font>' +
                                                    '<Fill>' +
                                                        '<CssParameter name="fill">#000000</CssParameter>' +
                                                    '</Fill>' +
                                                '</TextSymbolizer>' +
                                            '</Rule>' +
                                        '</FeatureTypeStyle>' +
                                    '</UserStyle>' +
                                '</NamedLayer>' +
                            '</StyledLayerDescriptor>';
            };
        };
        if (layerType === 'raster') {
            rasterMax = data['params']['rasterMax'];
            rasterMin = data['params']['rasterMin'];
            rasterNdv = data['params']['rasterNdv'];
            sldMin = '<ColorMapEntry color="#000000" quantity="' + rasterMin + '" label="values"/>';
            sldMax = '<ColorMapEntry color="#FFFFFF" quantity="' + rasterMax + '" label="values"/>';
            if (rasterNdv != null) {
                sldNdv = '<ColorMapEntry color="#000000" opacity="0.0" quantity="' + rasterNdv + '" label="nodata"/>'
            } else {
                sldNdv = ''
            }
            sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
                        '<StyledLayerDescriptor version="1.0.0" ' +
                        'xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" ' +
                        'xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" ' +
                        'xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                            '<NamedLayer>' +
                                '<Name>' + layerWorkspace + ':' + layerCode + '</Name>' +
                                '<UserStyle>' +
                                    '<FeatureTypeStyle>' +
                                        '<Rule>' +
                                            '<RasterSymbolizer>' +
                                                '<ColorMap>' +
                                                    sldNdv +
                                                    sldMin +
                                                    sldMax +
                                                '</ColorMap>' +
                                            '</RasterSymbolizer>' +
                                        '</Rule>' +
                                    '</FeatureTypeStyle>' +
                                '</UserStyle>' +
                            '</NamedLayer>' +
                        '</StyledLayerDescriptor>';
        };
        return sldString;
    };

    mapRemoveLayer = function(data) {

    };

    mapReorderLayers = function() {
        $('.workspace-layer-list li').each(function(i) {
            layerCode = $(this).attr('id').toString()
            if (typeof mapLayers[layerCode]['layer'] != 'undefined') {
                for (layerComponent in mapLayers[layerCode]['layer']) {
                    zIndex = 10000 - i * 3 - mapLayers[layerCode]['layer'][layerComponent]['zIndex'];
                    mapLayers[layerCode]['layer'][layerComponent]['imageSource'].setZIndex(10000 - i);
                };
                //mapLayers[$(this).attr('id').toString()].setZIndex(10000 - i);
            };
        });
    };

    mapZoomToLayer = function(layerCode) {
        map.getView().fit(mapLayers[layerCode].getSource().getExtent(), map.getSize());
    };

    ajaxUploadLayers = function(data) {
        $.ajax({
            url: '/apps/hydroshare-gis/ajax-add-layers/',
            type: 'POST',
            headers: {'X-CSRFToken': getCookie('csrftoken')},
            data: data,
            dataType: 'json',
            processData: false,
            contentType: false,
            error: function (ignore, textStatus) {
                console.log(textStatus)
            },
            success: function (response) {
                if (response['success'] === 'false') {
                    console.log(response['message'])
                } else {
                    var layerData = response['results']
                    mapAddLayer(layerData)
                }
            }
        });
    };

    pageInit = function() {
        $('.sortable').sortable({axis:"y", update:mapReorderLayers});      
    };

    uploadLocalFiles = function() {
        var fileType = $('.local-file-select').val()
        data = validateFiles(fileType);
        if (data === "INVALID") {
            alert("Please select a valid file.");
        } else {
            layerName = data.get('layerName').toString()
            layerCode = data.get('layerCode').toString()
            loadingGif = '{% static "hydroshare_gis/images/spinning_icon.gif" %}'
            layerLoadingSlide = `
                <li id="${layerCode}" data-layer-type="" class="workspace-layer-container workspace-layer-container-hover">
                    <div class="layer-control-container">
                        <img class="workspace-layer-icon" src="/static/hydroshare_gis/images/spinning_icon.gif">
                        <div class="workspace-layer-name">${layerName}</div>
                        <div class="dropdown-button">
                            <span class="glyphicon glyphicon-menu-hamburger dropdown-span"></span>
                        </div>
                        <div class="context-menu-wrapper" hidden>
                            <div class="context-menu">
                                <div class="context-menu-button edit-layer-symbology">Edit Symbology</div>
                                <div class="context-menu-button view-table">View Attribute Table</div>
                                <div class="context-menu-button zoom-to-layer">Zoom to Layer</div>
                                <div class="context-menu-button delete-layer">Delete Layer</div>
                            </div>
                        </div>
                        <label class="chk-container">
                            <input type="checkbox" checked="checked" class="checkmark-input">
                            <span class="checkmark"></span>
                        </label>
                    </div>
                    <div class="layer-symbology-container"></div>
                </li>
            `
            $(".workspace-layer-list").append(layerLoadingSlide);               
            ajaxUploadLayers(data);
        };

    };

    validateFiles = function(fileType) {

        var data = new FormData();

        if (fileType === 'shapefile') {
            var files = $('#shapefile-upload')[0].files;
            if (files.length === 0) {
                return "INVALID";
            };
            var fileNames = [];
            var fileTypes = [];
            var nameCounts = {};
            var typeCounts = {};
            Object.keys(files).forEach(function (file){
                fileNames.push(files[file].name.split('.').slice(0,-1).join('.'));
                fileTypes.push(files[file].name.split('.').pop());
            });
            for (var i = 0; i < fileNames.length; i++) {
                nameCounts[fileNames[i]] = 1 + (nameCounts[fileNames[i]] || 0);
            };
            for (var i = 0; i < fileTypes.length; i++) {
                typeCounts[fileTypes[i]] = 1 + (typeCounts[fileTypes[i]] || 0);
            };
            var reqFiles = ['shp','shx','dbf'].every(function(val) {
                return fileTypes.indexOf(val) !== -1;
            });
            var optFiles = fileTypes.every(function(val) {
                return ['shp','shx','dbf','prj','xml','sbn','sbx','cpg'].indexOf(val) !== -1;
            });
            if (fileTypes.length != Object.keys(typeCounts).length) {
                return "INVALID";
            };
            if (Object.keys(nameCounts).length != 1) {
                return "INVALID";
            };
            if (reqFiles === false) {
                return "INVALID";
            };
            if (optFiles === false) {
                return "INVALID";
            };
            var layerName = fileNames[0];
        };

        if (fileType === 'geotiff') {
            var files = $('#geotiff-upload')[0].files;
            if (files.length === 0) {
                return "INVALID";
            };
            var filename = files[0].name.split('.').slice(0,-1).join('.');
            var filetype = files[0].name.split('.').pop();
            if (filetype != 'tif') {
                return "INVALID";
            }
            var layerName = filename
        };

        layerCode = generateLayerCode();
        Object.keys(files).forEach(function (file) {
            data.append('files', files[file]);
            data.append('layerCode', layerCode);
            data.append('fileType', fileType);
            data.append('layerName', layerName);

        });

        return data;
        
    };

    getCookie = function(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                };
            };
        };
        return cookieValue;
    };

    generateLayerCode = function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        };
        
        return 'L-' + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };

    throttle = function(func, wait, options) {
        var context, args, result;
        var timeout = null;
        var previous = 0;
        if (!options) options = {};
        var later = function() {
            previous = options.leading === false ? 0 : Date.now();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        };
        return function() {
            var now = Date.now();
            if (!previous && options.leading === false) previous = now;
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > wait) {
              if (timeout) {
                clearTimeout(timeout);
                timeout = null;
              }
              previous = now;
              result = func.apply(context, args);
              if (!timeout) context = args = null;
            } else if (!timeout && options.trailing !== false) {
              timeout = setTimeout(later, remaining);
            }
            return result;
        };
    };

    addColorPicker = function(element, defaultColor) {
        $(element).spectrum({
            color: {'r': defaultColor[0],'g': defaultColor[1],'b': defaultColor[2]},
            showPaletteOnly: true,
            togglePaletteOnly: true,
            togglePaletteMoreText: 'more',
            togglePaletteLessText: 'less',
            showButtons: false,
            palette: [
                ["#000","#444","#666","#999","#ccc","#eee","#f3f3f3","#fff"],
                ["#f00","#f90","#ff0","#0f0","#0ff","#00f","#90f","#f0f"],
                ["#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc"],
                ["#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd"],
                ["#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0"],
                ["#c00","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79"],
                ["#900","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47"],
                ["#600","#783f04","#7f6000","#274e13","#0c343d","#073763","#20124d", '#20124e']
            ],
            showButtons: true,
            showAlpha: true,
            move: function (color) {
                layerCode = $(this).parents(':eq(3)').attr('id');
                layerComponent = $(this).attr('comp');
                rgbColor = color.toRgb()
                colorOutput = [rgbColor['r'],rgbColor['g'],rgbColor['b']]
                opacity = rgbColor['a']
                mapLayers[layerCode]["layer"][layerComponent]["symbologyData"]["color"] = colorOutput; 
                mapLayers[layerCode]["layer"][layerComponent]["rasterSource"].changed();
                mapLayers[layerCode]["layer"][layerComponent]["imageSource"].setOpacity(opacity);
            }
        })
    };

    uiToggleNavTabs = function() {
        if ($(this).attr('id') === 'nav-pane-search-tab-toggle') {
            $('#workspace-tab-content').hide();
            $('#nav-pane-workspace-tab-toggle').css('background-color', '#D3D3D3');
            $('#search-tab-content').show();
            $('#nav-pane-search-tab-toggle').css('background-color', '#FFFFFF');
        };
        if ($(this).attr('id') === 'nav-pane-workspace-tab-toggle') {
            $('#workspace-tab-content').show();
            $('#nav-pane-workspace-tab-toggle').css('background-color', '#FFFFFF');
            $('#search-tab-content').hide();
            $('#nav-pane-search-tab-toggle').css('background-color', '#D3D3D3');
        };
    };

    mapToggleLayerVisibility = function() {
        layerCode = $(this).parents(':eq(2)').attr('id');
        for (var layerComponent in mapLayers[layerCode]['layer']) {
            if (mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['visible'] === true) {
                mapLayers[layerCode]['layer'][layerComponent]['imageSource'].setVisible($(this).is(':checked'))   
            }
        };
    };

    uiHideLayerContextMenu = function(evt) {
        if (!($(evt.target).hasClass('contextmenu'))) {
            $('.context-menu-wrapper').hide()
        }
    };



    /******************************************************
     ****************** LISTENERS *************************
     ******************************************************/

    /* Listener for toggling nav sidebar tabs */
    $(document).on('click', '.tab-nav-button', uiToggleNavTabs);

    /* Listener for toggling layer visibility */
    $(document).on('click', '.checkmark-input', mapToggleLayerVisibility);

    /* Listener for hiding layer context menu on scroll event */
    $(document).on('mousewheel', function(evt) {
        if (!($(evt.target).hasClass('contextmenu'))) {
            $('.context-menu-wrapper').hide()
        }
    });

    /* Listener for hiding layer context menu on mousedown event */
    $(document).on('mousedown', function(evt) {
        if (!($(evt.target).hasClass('dropdown-button')) && !($(evt.target).hasClass('dropdown-span')) && !($(evt.target).hasClass('context-menu-wrapper')) && !($(evt.target).hasClass('context-menu-button'))) {
            $('.context-menu-wrapper').hide()
        }
    });

    /*  */
    $(document).on('click', '.dropdown-button', function(evt) {
        var $menuItem = $(this).parents(':eq(0)'),
            $submenuWrapper = $menuItem.children('.context-menu-wrapper');
        
        if ($submenuWrapper.is(':visible')) {
            $('.context-menu-wrapper').hide()
        } else {
            $('.context-menu-wrapper').hide()
            var menuItemPos = $menuItem.position();            
            $submenuWrapper.css({
                top: menuItemPos.top - 37,
                left: menuItemPos.left + Math.round($menuItem.outerWidth() * 1.01)
            });
            $submenuWrapper.show()
        };
    });

    $(document).on('click', '.zoom-to-layer', function(evt) {
        $('.context-menu-wrapper').hide()
        mapZoomToLayer($(this).parents(':eq(3)').attr('id'))
    });

    $(document).on('click', '.edit-layer-symbology', function(evt) {
        symbologyLayerCode = $(this).parents(':eq(3)').attr('id')
        $('.workspace-layer-list').sortable("disable")
        $('.context-menu-wrapper').hide()
        $(".workspace-layer-container").removeClass('workspace-layer-container-hover')
        $(".workspace-layer-container:not(#" + symbologyLayerCode + ")").hide()
        $("#" + symbologyLayerCode).find(".layer-symbology-container").show()
    });


    $(document).on('input', '.fill-slider', throttle(function(evt) {
        transparency = 1 - $(this).val() / 100
        symbologyLayerCode = $(this).parents(':eq(2)').attr('id');
        symbologyLayerFill = mapLayers[symbologyLayerCode].getStyle()['Xa']['b'];
        symbologyLayerFillColor = symbologyLayerFill.slice(0, 3);
        mapLayers[symbologyLayerCode].getStyle()['Xa']['b'] = symbologyLayerFillColor.concat([transparency.toString()]); 
        mapLayers[symbologyLayerCode].changed();

    }, 100));

    $(document).on('input', '.border-slider', throttle(function(evt) {
        transparency = 1 - $(this).val() / 100
        symbologyLayerCode = $(this).parents(':eq(2)').attr('id');
        symbologyLayerFill = mapLayers[symbologyLayerCode].getStyle()['Ya']['a'];
        symbologyLayerFillColor = symbologyLayerFill.slice(0, 3);
        mapLayers[symbologyLayerCode].getStyle()['Ya']['a'] = symbologyLayerFillColor.concat([transparency.toString()]); 
        mapLayers[symbologyLayerCode].changed();

    }, 100));

    $(document).on('click', '.symbology-tab-button', function(evt) {
        tabName = $(this).attr('class').split(' ')[1]
        tabContent = $(".symbology-tab-content");
        for (i = 0; i < tabContent.length; i++) {
            tabContent[i].style.display = "none";
        }
        tabLinks = $(".symbology-tab-button");
        for (i = 0; i < tabLinks.length; i++) {
            tabLinks[i].className = tabLinks[i].className.replace(" active", "");
        }
        $('.' + tabName + '-container').show();
        evt.currentTarget.className += " active";
    });

    $(document).on('change', '.border-thickness-input', function(evt) {
        symbologyLayerCode = $(this).parents(':eq(2)').attr('id')
        inputThickness = $(this).val()
        mapLayers[symbologyLayerCode].getStyle()['Ya']['c'] = inputThickness
        mapLayers[symbologyLayerCode].changed();
    });

    $(document).on('click', '.exit-symbology-button', function(evt) {
        symbologyLayerCode = $(this).parents(':eq(3)').attr('id')
        $('.workspace-layer-list').sortable("enable")
        $('.context-menu-wrapper').hide()
        $(".workspace-layer-container").addClass('workspace-layer-container-hover')
        $(".workspace-layer-container:not(#" + symbologyLayerCode + ")").show()
        $("#" + symbologyLayerCode).find(".layer-symbology-container").hide()
    });

    $(document).on('click', '.view-table', function(evt) {
        tableLayerCode = $(this).parents(':eq(3)').attr('id')
        attrTableRows = []
        if ($.fn.DataTable.isDataTable('.attr-table')) {
            $('.attr-table').DataTable().destroy()
            $('.attr-table').empty()
        }
        for (var i = 1; i < Object.keys(mapLayers[tableLayerCode].getSource()["j"]).length; i++) {
            if (i === 1) {
                tableKeys = Object.keys(mapLayers[tableLayerCode].getSource()["j"][tableLayerCode + '.' + i.toString()]["N"])
                tableAttrKeys = tableKeys.filter(e => e !== "geometry")
                attrTableHead = `
                    <thead>
                        <tr>
                            ${tableAttrKeys.map((attrName, i) => `
                                <th>
                                    ${attrName}
                                </th>
                            `.trim()).join('')}
                        </tr>
                    </thead>
                `
                $('.attr-table').append(attrTableHead)
            }
            maaplaayer = mapLayers[tableLayerCode].getSource()["j"][tableLayerCode + '.' + i.toString()]["N"]
            attrTableRow = `
                    <tr>
                        ${tableAttrKeys.map((attrName, i) => `
                            <td>
                                ${maaplaayer[attrName]}
                            </td>
                        `.trim()).join('')}
                    </tr>
                `
            
            attrTableRows.push(attrTableRow)
        }
        $('.attr-table').append(`<tbody>${attrTableRows.join('')}</tbody>`)
        $('.attr-table').DataTable({
            sort: true,
            order: [[1, 'asc']]
        });
        $('.attr-table').wrap('<div class="data-tables-scroll" />');

        $('#attr-table-modal').modal('show')
    });

    $(document).on('click', '.toggle-nav', function(evt) {
        setTimeout(function() {map.updateSize();}, 150);
    });

    $(document).on('change', '.local-file-select', function(evt) {
        $('.local-file-upload').hide()
        $('#' + $(this).val() + '-upload').show()
    });

    $(document).on('change', '.colormap-select', function(evt) {
        layerCode = $(this).parents(':eq(2)').attr('id');
        rasterLayerSymbology[layerCode] = $(this).val();
        rasterSourceList[layerCode].changed();
    });

    $(document).on('change', '.polygon-border-thickness', function(evt) {
        layerCode = $(this).parents(':eq(3)').attr('id');
        layerComponent = 'stroke'

        data = {
            'layerType': 'polygon',
            'layerWorkspace': 'hs_gis',
            'layerCode': layerCode,
            'layerComponent': layerComponent,
            'params': {
                'width': $(this).val()
            }
        };

        sldString = getSLDString(data);

        mapLayers[layerCode]['layer'][layerComponent]['layerSource'].updateParams({'SLD_BODY': sldString});
        mapLayers[layerCode]['layer'][layerComponent]['imageSource'].getSource().changed()
    });

    $(document).on('change', '.line-thickness', function(evt) {
        layerCode = $(this).parents(':eq(3)').attr('id');
        layerComponent = 'stroke'

        data = {
            'layerType': 'polygon',
            'layerWorkspace': 'hs_gis',
            'layerCode': layerCode,
            'layerComponent': layerComponent,
            'params': {
                'width': $(this).val()
            }
        };

        sldString = getSLDString(data);

        mapLayers[layerCode]['layer'][layerComponent]['layerSource'].updateParams({'SLD_BODY': sldString});
        mapLayers[layerCode]['layer'][layerComponent]['imageSource'].getSource().changed()
    });

    $(document).on('change', '.raster-colormap-select', function(evt) {
        layerCode = $(this).parents(':eq(3)').attr('id');
        layerComponent = 'raster';
        mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['colorMap'] = $(this).val();
        mapLayers[layerCode]['layer'][layerComponent]['rasterSource'].changed(); 
    })

    /*****************************************************************************************
     ************************************ INIT FUNCTIONS *************************************
     *****************************************************************************************/

    pageInit();
    mapInit();

/*
}());
*/

