(function packageHydroShareGIS() {

    //'use strict';

    /*****************************************************************************************
     *********************************** GLOBAL VARIABLES ************************************
     *****************************************************************************************/

    var map;
    var mapLayers = {};


    /******************************************************
     ************* FUNCTION DECLARATIONS ******************
     ******************************************************/

    var initLayerList;
    var initMap;
    var getSymbologyMenuHTML;
    var getLayerObject;
    var getSLDString;
    var addLayerToMap;
    var mapRemoveLayer;
    var mapReorderLayers;
    var zoomToLayer;
    var ajaxAddLayer;
    var addLayerError;
    var uploadLocalFiles;
    var validateFiles;
    var getCookie;
    var generateLayerCode;
    var addColorPicker;
    var toggleNavTabs;
    var mapToggleLayerVisibility;
    var changeDisplayName;
    var toggleContextMenu;
    var hideContextMenu;


    /******************************************************
     ****************** FUNCTIONS *************************
     ******************************************************/

    /* Runs page initialization functions */
    initLayerList = function() {

        $('.sortable').sortable({axis: 'y', update: mapReorderLayers});
    };

    /* Initializes the OpenLayers map */
    initMap = function() {
        var bingMapKey = 'eLVu8tDRPeQqmBlKAjcw~82nOqZJe2EpKmqd-kQrSmg~AocUZ43djJ-hMBHQdYDyMbT-Enfsk0mtUIGws1WeDuOvjY4EXCH-9OK3edNLDgkc';
        var initialMapCenter = ol.proj.transform([0, 0], 'EPSG:4326', 'EPSG:3857');
        var initialZoomLevel = 1.8;
        var minZoomLevel = 1.8;
        var maxZoomLevel = 19;
        var bingBaseMap = new ol.layer.Tile({
            source: new ol.source.BingMaps({
                key: bingMapKey,
                imagerySet: 'AerialWithLabels',
            })
        });
        map = new ol.Map({
            target: 'map',
            controls : ol.control.defaults({
                attribution : false,
            }),
            view: new ol.View({
                center: initialMapCenter,
                zoom: initialZoomLevel,
                minZoom: minZoomLevel,
                maxZoom: maxZoomLevel
            }),
            layers: [bingBaseMap]
        });
        updateMapSize();
    };

    getSymbologyFunction = function(symbologyFunctionName) {
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
        var symbologyFunction = symbologyFunctions[symbologyFunctionName];
        return symbologyFunction;
    };

    getColorMap = function(colorMapName) {
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
        colorMap = colorMaps[colorMapName]
        return colorMap;
    };

    /* Returns html for a layer's symbology menu */
    getSymbologyMenuHTML = function(layerType) {
        var symbologyMenuHTML = {
            'polygon':`
                <br>
                <div>
                    <label>Fill Color:</label>
                    <div class="symbology-input-container">
                        <input comp="fill" type="text" class="color-selector polygon-fill-color"/>
                    </div>
                    <br>
                    <br>
                    <label>Border Color:</label>
                    <div class="symbology-input-container">
                        <input comp="stroke" type="text" class="color-selctor polygon-border-color"/>
                    </div>
                    <br>
                    <br>
                    <label>Border Thickness:</label>
                    <div class="symbology-input-container">
                        <select class="polygon-border-thickness">
                            <option selected="selected" value="1">1</option>
                            <option value="2">2</option>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="16">16</option>
                            <option value="18">18</option>
                        </select>
                    </div>
                </div>
                <br>
                <button class="exit-symbology-button">Done</button>
            `,
            'point':`
                <br>
                <div>
                    <label>Fill Color:</label>
                    <div class="symbology-input-container">
                        <input type="text" class="color-selector point-fill-color"/></label>
                    </div>
                    <br>
                    <label>Point Size:</label>
                    <div class="symbology-input-container">
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
                    </div>
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
                    <label>BorderColor:<input type="text" class="color-selector point-border-color"/></label>
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
                    <label>Line Color:</label>
                    <div class="symbology-input-container">
                        <input comp="stroke" type="text" class="color-selector line-color"/>
                    </div>
                    <br>
                    <br>
                    <label>Line Thickness:</label>
                    <div class="symbology-input-container">
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
                    </div>
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
        return symbologyMenuHTML[layerType];
    };

    /* Returns javascript object for storing layer data */
    getLayerObject = function(layerType) {
        var layerObjects = {
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
        };
        return layerObjects[layerType];
    };

    /* Returns sld string for styling geoserver */
    getSLDString = function(layerType, layerWorkspace, layerCode, layerComponent, symbologyData) {
        if (layerType === 'point') {
            if (layerComponent === 'fill') {
                var sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
                            '<StyledLayerDescriptor version="1.0.0" ' +
                            'xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" ' +
                            'xmlns="http://www.opengis.net/sld" ' +
                            'xmlns:ogc="http://www.opengis.net/ogc" ' +
                            'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
                            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                                '<NamedLayer>' +
                                    '<Name>' + layerWorkspace + ':' + layerCode + '</Name>' +
                                    '<UserStyle>' +
                                        '<FeatureTypeStyle>' +
                                            '<Rule>' +
                                                '<PointSymbolizer>' +
                                                    '<Graphic>' +
                                                        '<Mark>' +
                                                            '<WellKnownName>' + symbologyData['pointShape'] + '</WellKnownName>' +
                                                            '<Fill>' +
                                                                '<CssParameter name="fill">#FFFFFF</CssParameter>' +
                                                            '</Fill>' +
                                                        '</Mark>' +
                                                        '<Size>' + symbologyData['pointSize'] + '</Size>' +
                                                    '</Graphic>' +
                                                '</PointSymbolizer>' +
                                            '</Rule>' +
                                        '</FeatureTypeStyle>' +
                                    '</UserStyle>' +
                                '</NamedLayer>' +
                            '</StyledLayerDescriptor>';
            };
            if (layerComponent === 'stroke') {
                var sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
                            '<StyledLayerDescriptor version="1.0.0" ' +
                            'xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" ' +
                            'xmlns="http://www.opengis.net/sld" ' +
                            'xmlns:ogc="http://www.opengis.net/ogc" ' +
                            'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
                            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                                '<NamedLayer>' +
                                    '<Name>' + layerWorkspace + ':' + layerCode + '</Name>' +
                                    '<UserStyle>' +
                                        '<FeatureTypeStyle>' +
                                            '<Rule>' +
                                                '<PointSymbolizer>' +
                                                    '<Graphic>' +
                                                        '<Mark>' +
                                                            '<WellKnownName>' + symbologyData['pointShape'] + '</WellKnownName>' +
                                                            '<Stroke>' +
                                                                '<CssParameter name="stroke">#FF0000</CssParameter>' +
                                                                '<CssParameter name="stroke-width">' + symbologyData['strokeWidth'] + '</CssParameter>' +
                                                                '<CssParameter name="stroke-linecap">round</CssParameter>' +
                                                                '<CssParameter name="stroke-linejoin">round</CssParameter>' +
                                                            '</Stroke>' +
                                                        '</Mark>' +
                                                        '<Size>' + symbologyData['pointSize'] + '</Size>' +
                                                    '</Graphic>' +
                                                '</PointSymbolizer>' +
                                            '</Rule>' +
                                        '</FeatureTypeStyle>' +
                                    '</UserStyle>' +
                                '</NamedLayer>' +
                            '</StyledLayerDescriptor>';
            };
            if (layerComponent === 'label') {
                var sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
                            '<StyledLayerDescriptor version="1.0.0" ' +
                            'xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" ' +
                            'xmlns="http://www.opengis.net/sld" ' +
                            'xmlns:ogc="http://www.opengis.net/ogc" ' +
                            'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
                            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                                '<NamedLayer>' +
                                    '<Name>' + layerWorkspace + ':' + layerCode + '</Name>' +
                                    '<UserStyle>' +
                                        '<FeatureTypeStyle>' +
                                            '<Rule>' +
                                                '<TextSymbolizer>' +
                                                    '<Label>' + 
                                                        '<ogc:PropertyName>' + symbologyData['propertyName'] + '</ogc:PropertyName>' +
                                                    '</Label>' +
                                                    '<Font>' +
                                                        '<CssParameter name="font-family">' + symbologyData['fontFamily'] + '</CssParameter>' +
                                                        '<CssParameter name="font-size">' + symbologyData['fontSize'] + '</CssParameter>' +
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
        if (layerType === 'line') {
            if (layerComponent === 'stroke') {
                var sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
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
                                                        '<CssParameter name="stroke-width">' + symbologyData['width'] + '</CssParameter>' +
                                                        '<CssParameter name="stroke-linecap">round</CssParameter>' +
                                                        '<CssParameter name="stroke-linejoin">round</CssParameter>' +
                                                    '</Stroke>' +
                                                '</LineSymbolizer>' +
                                            '</Rule>' +
                                        '</FeatureTypeStyle>' +
                                    '</UserStyle>' +
                                '</NamedLayer>' +
                            '</StyledLayerDescriptor>';
            };
            if (layerComponent === 'label') {
                var sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
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
                                                '<TextSymbolizer>' +
                                                    '<Label>' + 
                                                        '<ogc:PropertyName>' + symbologyData['propertyName'] + '</ogc:PropertyName>' +
                                                    '</Label>' +
                                                    '<Font>' +
                                                        '<CssParameter name="font-family">' + symbologyData['fontFamily'] + '</CssParameter>' +
                                                        '<CssParameter name="font-size">' + symbologyData['fontSize'] + '</CssParameter>' +
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
        if (layerType === 'polygon') {
            if (layerComponent === 'fill') {
                var sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
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
                var sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
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
                                                        '<CssParameter name="stroke-width">' + symbologyData['width'] + '</CssParameter>' +
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
                var sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
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
                                                        '<ogc:PropertyName>' + symbologyData['propertyName'] + '</ogc:PropertyName>' +
                                                    '</Label>' +
                                                    '<Font>' +
                                                        '<CssParameter name="font-family">' + symbologyData['fontFamily'] + '</CssParameter>' +
                                                        '<CssParameter name="font-size">' + symbologyData['fontSize'] + '</CssParameter>' +
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
            var sldMin = '<ColorMapEntry color="#000000" quantity="' + symbologyData['rasterMin'] + '" label="values"/>';
            var sldMax = '<ColorMapEntry color="#FFFFFF" quantity="' + symbologyData['rasterMax'] + '" label="values"/>';
            if (symbologyData['rasterNdv'] != null) {
                var sldNdv = '<ColorMapEntry color="#000000" opacity="0.0" quantity="' + symbologyData['rasterNdv'] + '" label="nodata"/>'
            } else {
                var sldNdv = ''
            }
            var sldString = '<?xml version="1.0" encoding="ISO-8859-1"?>' +
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

    getLegendSVG = function(layerCode) {
        layerType = mapLayers[layerCode]['type'];
        if (layerType === 'polygon') {
            fillColor = mapLayers[layerCode]['layer']['fill']['symbologyData']['color']
            strokeColor = mapLayers[layerCode]['layer']['stroke']['symbologyData']['color']
            svgIcon = `
                <svg height="24" width="24">
                  <polygon points="1,23 5,5 20,1 23,20" style="fill:rgb(${fillColor[0]},${fillColor[1]},${fillColor[2]});stroke:rgb(${strokeColor[0]},${strokeColor[1]},${strokeColor[2]});stroke-width:2" />
                </svg>
            `
        };
        if (layerType === 'line') {
            strokeColor = mapLayers[layerCode]['layer']['stroke']['symbologyData']['color']
            svgIcon = `
                <svg height="24" width="24">
                  <polyline points="1,23 20,18 5,7 23,1" style="fill:none;stroke:rgb(${strokeColor[0]},${strokeColor[1]},${strokeColor[2]});stroke-width:2" />
                </svg>
            `
        };
        if (layerType === 'raster') {
            colorMapName = mapLayers[layerCode]['layer']['raster']['symbologyData']['colorMap'];
            colorMap = getColorMap(colorMapName);
            svgGradient = ``
            for (i = 0; i < colorMap['colors'].length; i++) { 
                svgGradient = svgGradient + `<stop offset="${(colorMap['positions'][i] * 100).toString()}%" style="stop-color:rgb(${colorMap['colors'][i][0]},${colorMap['colors'][i][1]},${colorMap['colors'][i][2]});stop-opacity:1" />`
            };
            svgIcon = `
                <svg height="24" width="24">
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                      ${svgGradient}
                    </linearGradient>
                  </defs>
                  <rect width="24" height="24" fill="url(#grad1)" />
                </svg>
            `
        };
        return svgIcon
    }

    /* Adds layer to OpenLayers map */
    addLayerToMap = function(layerType, layerWorkspace, layerCode, layerData) {
        mapLayers[layerCode] = getLayerObject(layerType);
        for (var layerComponent in mapLayers[layerCode]['layer']) {
            mapLayers[layerCode]['bbox'] = layerData['bbox']
            if (layerType === 'raster') {
                mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['rasterMax'] = layerData['raster_max']
                mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['rasterMin'] = layerData['raster_min']
                mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['rasterNdv'] = layerData['raster_ndv']
            };
            var symbologyData = mapLayers[layerCode]['layer'][layerComponent]['symbologyData'];
            var sldBody = getSLDString(layerType, layerWorkspace, layerCode, layerComponent, symbologyData);
            var geoserverUrl = $('#geoserver-endpoint').text() + '/wms'
            mapLayers[layerCode]['layer'][layerComponent]['layerSource'] = new ol.source.ImageWMS({
                url: geoserverUrl,
                params: {'LAYERS': layerWorkspace + ':' + layerCode, 'SLD_BODY': sldBody},
                serverType: 'geoserver',
                crossOrigin: 'Anonymous'
            });
            var componentSymbologyFunction = getSymbologyFunction(mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['function']);
            mapLayers[layerCode]['layer'][layerComponent]['rasterSource'] = new ol.source.Raster({
                sources: [mapLayers[layerCode]['layer'][layerComponent]['layerSource']],
                operation: function(pixels, data) {
                    pixel = symbologyFunction(pixels, data);
                    return pixel
                },
                lib: {
                    symbologyFunction: componentSymbologyFunction
                }
            });
            mapLayers[layerCode]['layer'][layerComponent]['rasterSource'].layerComponent = layerComponent;
            mapLayers[layerCode]['layer'][layerComponent]['rasterSource'].layerCode = layerCode;
            mapLayers[layerCode]['layer'][layerComponent]['rasterSource'].on('beforeoperations', function(event) {
                var data = event.data;
                if (mapLayers[event.target.layerCode]['layer'][event.target.layerComponent]['symbologyData']['function'] === 'applySingleColor') {
                    data['color'] = mapLayers[event.target.layerCode]['layer'][event.target.layerComponent]['symbologyData']['color'];
                };
                if (mapLayers[event.target.layerCode]['layer'][event.target.layerComponent]['symbologyData']['function'] === 'applyColorMap') {
                    data['colorMap'] = getColorMap(mapLayers[event.target.layerCode]['layer'][event.target.layerComponent]['symbologyData']['colorMap']);
                };
            });
            mapLayers[layerCode]['layer'][layerComponent]['imageSource'] = new ol.layer.Image({
                source: mapLayers[layerCode]['layer'][layerComponent]['rasterSource']
            });
            mapLayers[layerCode]['layer'][layerComponent]['imageSource'].setVisible(mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['visible']);
            mapLayers[layerCode]['layer'][layerComponent]['imageSource'].setOpacity(mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['opacity']);
            map.addLayer(mapLayers[layerCode]['layer'][layerComponent]['imageSource']);
        };
        //Add SVG icons for legend
        console.log($('#' + layerCode).find('.workspace-layer-icon-container'))
        console.log($($('#' + layerCode).find('.workspace-layer-icon-container')))
        $('#' + layerCode).find('.workspace-layer-icon-container').html(getLegendSVG(layerCode))
        $('#' + layerCode).find('.layer-symbology-container').eq(0).html(getSymbologyMenuHTML(layerType)); 
        if (layerType === 'polygon') {
            addColorPicker('.polygon-fill-color', mapLayers[layerCode]['layer']['fill']['symbologyData']['color']);
            addColorPicker('.polygon-border-color', mapLayers[layerCode]['layer']['stroke']['symbologyData']['color']);
        };
        if (layerType === 'line') {
            addColorPicker('.line-color', mapLayers[layerCode]['layer']['stroke']['symbologyData']['color']);
        };
        return
    };

    /* Removes a layer from the map */
    mapRemoveLayer = function(data) {
    };

    /* Reorders map layers based on workspace list */
    mapReorderLayers = function() {
        $('.workspace-layer-list li').each(function(i) {
            layerCode = $(this).attr('id').toString()
            if (typeof mapLayers[layerCode]['layer'] != 'undefined') {
                for (layerComponent in mapLayers[layerCode]['layer']) {
                    zIndex = 10000 - i * 3 - mapLayers[layerCode]['layer'][layerComponent]['zIndex'];
                    mapLayers[layerCode]['layer'][layerComponent]['imageSource'].setZIndex(10000 - i);
                };
            };
        });
    };

    /* Allows a user to zoom to a specified layer */
    zoomToLayer = function(evt) {
        layerCode = $(this).parents(':eq(3)').attr('id')
        layerExtent = mapLayers[layerCode]['bbox'].slice(0,4)  
        layerExtentSize = Math.max(parseFloat(layerExtent[1]) - parseFloat(layerExtent[0]), parseFloat(layerExtent[3])) - parseFloat(layerExtent[2])
        mapZoom = (-0.8 * layerExtentSize) + 9.5
        layerCenter = [((parseFloat(layerExtent[0]) + parseFloat(layerExtent[1])) / 2),  ((parseFloat(layerExtent[2]) + parseFloat(layerExtent[3])) / 2)]
        map.getView().setCenter(ol.proj.transform(layerCenter, 'EPSG:4326', 'EPSG:3857'))
        map.getView().setZoom(mapZoom)
        $('.context-menu-wrapper').hide()
    };

    /* Uploads layer files to the server */
    ajaxAddLayer = function(data) {
        $.ajax({
            url: '/apps/hydroshare-gis/ajax-add-layer/',
            type: 'POST',
            headers: {'X-CSRFToken': getCookie('csrftoken')},
            data: data,
            dataType: 'json',
            processData: false,
            contentType: false,
            beforeSend: function() {
                this.layerName = data.get('layerName')
                this.layerCode = data.get('layerCode');
            },
            error: function () {
                layerName = this.layerName;
                layerCode = this.layerCode;
                errorLog = 'An internal server error occured. Layer "' + layerName + '" could not be added at this time.';
                errorMessage = "Oops! Something went wrong!";
                addLayerError(layerName, layerCode, errorMessage, errorLog);
            },
            success: function (response) {
                if (response['success'] === 'false') {
                    // call function "addLayerError"
                } else {
                    var layerType = response['results']['layer_type'];
                    var layerWorkspace = response['results']['workspace'];
                    var layerCode = response['results']['layer_code'];
                    var layerData = response['results']['layer_data'];
                    addLayerToMap(layerType, layerWorkspace, layerCode, layerData);
                }
            }
        });
    };

    /* Handles layer creation errors */
    addLayerError = function(layerName, layerCode, errorMessage, errorLog) {
        console.error(errorLog);
        $('#' + layerCode).find('img').attr('src', '/static/hydroshare_gis/images/error-icon.png')
    };

    /* Retrieves user uploaded files */
    uploadLocalFiles = function() {
        var fileType = $('.local-file-select').val()
        var data = validateFiles(fileType);
        if (data === "INVALID") {
            alert("Please select a valid file.");
        } else {
            var layerName = data.get('layerName').toString()
            var layerCode = data.get('layerCode').toString()
            var loadingGif = '{% static "hydroshare_gis/images/spinning_icon.gif" %}'
            var layerLoadingSlide = `
                <li id="${layerCode}" data-layer-type="" class="workspace-layer-container workspace-layer-container-hover">
                    <div class="layer-control-container">
                        <div class="workspace-layer-icon-container">
                            <img class="workspace-layer-icon" src="/static/hydroshare_gis/images/spinning_icon.gif">
                        </div>
                        <div class="workspace-layer-name-container">
                            <div class="workspace-layer-name">${layerName}</div>
                        </div>
                        <div class="context-menu-toggle" disabled>
                            <span class="glyphicon glyphicon-menu-hamburger dropdown-span"></span>
                        </div>
                        <div class="context-menu-wrapper" hidden>
                            <div class="context-menu">
                                <div class="context-menu-button edit-layer-symbology">Edit Symbology</div>  
                                <div class="context-menu-button edit-layer-visibility layer-visible">Hide Layer</div>   
                                <div class="context-menu-button edit-layer-name">Rename Layer</div>                         
                                <div class="context-menu-button view-table">View Attribute Table</div>
                                <div class="context-menu-button zoom-to-layer">Zoom to Layer</div>
                                <div class="context-menu-button view-on-hydroshare">View on HydroShare</div>                                
                                <div class="context-menu-button remove-layer">Remove Layer</div>
                            </div>
                        </div>
                    </div>
                    <div class="layer-symbology-container"></div>
                </li>
            `
            $(".workspace-layer-list").append(layerLoadingSlide);               
            ajaxAddLayer(data);
        };
    };

    /* Performs initial file validation and prepares files for upload */
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
        var layerCode = generateLayerCode();
        Object.keys(files).forEach(function (file) {
            data.append('files', files[file]);
            data.append('layerCode', layerCode);
            data.append('fileType', fileType);
            data.append('layerName', layerName);

        });
        return data;
    };

    /* Gets cookie to be used with ajax requests */
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

    /* Generates unique layer code to be used by the app */
    generateLayerCode = function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        };
        return 'L-' + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };

    /* Initializes color picker for layer symbology */
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
                $('#' + layerCode).find('.workspace-layer-icon-container').html(getLegendSVG(layerCode))
            }
        })
    };

    /* Controls toggle between search tab and workspace tab */
    toggleNavTabs = function() {
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

    /* Allows the user to toggle a layer's visibility */
    mapToggleLayerVisibility = function() {
        layerCode = $(this).parents(':eq(3)').attr('id');
        if ($(this).hasClass('layer-visible')) {
            for (var layerComponent in mapLayers[layerCode]['layer']) {
                if (mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['visible'] === true) {
                    mapLayers[layerCode]['layer'][layerComponent]['imageSource'].setVisible(false)   
                }
            }
            $(this).removeClass('layer-visible');
            $(this).text('Show Layer')
        } else {
            for (var layerComponent in mapLayers[layerCode]['layer']) {
                if (mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['visible'] === true) {
                    mapLayers[layerCode]['layer'][layerComponent]['imageSource'].setVisible(true)   
                }
            }
            $(this).addClass('layer-visible'); 
            $(this).text('Hide Layer')         
        };
        $('.context-menu-wrapper').hide()
    };

    /* Allows user to change the display name of a layer */
    changeDisplayName = function(evt) {
        if ($(this).hasClass('edit-layer-name')) {
            displayDiv = $(this).parents(':eq(2)').children('.workspace-layer-name-container')
        };
        if ($(this).hasClass('workspace-layer-name')) {
            displayDiv = $(this).parents(':eq(0)');
        };
        $('.context-menu-wrapper').hide();
        displayName = displayDiv.children('.workspace-layer-name').html();
        displayDiv.html('<input class="workspace-layer-name-input" type="text" value="' + displayName + '" />');
        displayDiv.children('.workspace-layer-name-input').focus();
        displayDiv.children('.workspace-layer-name-input').select();
        displayDiv.children('.workspace-layer-name-input').keyup(function (event) {
            if (event.keyCode == 13) {
                newName = displayDiv.children('.workspace-layer-name-input').val().trim()
                if (newName === '') {
                    newName = 'Undefined'
                };
                $(displayDiv).html('<div class="workspace-layer-name">' + newName + '</div>');
            };
        });
        $(document).on('mousedown', function (evt) {
            if (!($(evt.target).hasClass('workspace-layer-name-input'))) {
                try {
                    newName = displayDiv.children('.workspace-layer-name-input').val().trim()
                    if (newName === '') {
                        newName = 'Undefined'
                    };
                    $(displayDiv).html('<div class="workspace-layer-name">' + newName + '</div>');
                    evt.removeEventListener();
                }
                catch (err) {};
            };
        });
    };

    /* Toggles layer context menu */
    toggleContextMenu = function(evt) {
        var $menuItem = $(this).parents(':eq(0)'),
            $submenuWrapper = $menuItem.children('.context-menu-wrapper');
        if ($submenuWrapper.is(':visible')) {
            $('.context-menu-wrapper').hide()
        } else {
            $('.context-menu-wrapper').hide()
            var menuItemPos = $menuItem.position();
            $submenu = $submenuWrapper.children('.context-menu')       
            $submenuWrapper.css({
                top: menuItemPos.top - (12 * ($submenu.children().length - 1)),
                left: menuItemPos.left + Math.round($menuItem.outerWidth() * 1.01)
            });
            $submenuWrapper.show()
        };
    };

    /* Hides layer context menu when page is clicked or scrolled */
    hideContextMenu = function(evt) {
        if (!($(evt.target).hasClass('context-menu')) && (evt.type === 'mousewheel')) {
            $('.context-menu-wrapper').hide()
        };
        if (!($(evt.target).hasClass('context-menu-toggle')) && !($(evt.target).hasClass('dropdown-span')) && !($(evt.target).hasClass('context-menu-wrapper')) && !($(evt.target).hasClass('context-menu-button')) && (evt.type === 'mousedown')) {
            $('.context-menu-wrapper').hide()
        };       
    };

    toggleLayerSymbologyMenu = function(evt) {
        if ($(evt.target).hasClass('edit-layer-symbology')) {
            symbologyLayerCode = $(this).parents(':eq(3)').attr('id')
            $('.workspace-layer-list').sortable("disable")
            $('.context-menu-wrapper').hide()
            $(".workspace-layer-container").removeClass('workspace-layer-container-hover')
            $(".workspace-layer-container:not(#" + symbologyLayerCode + ")").hide()
            $("#" + symbologyLayerCode).find(".layer-symbology-container").show()
        };
        if ($(evt.target).hasClass('exit-symbology-button')) {
        symbologyLayerCode = $(this).parents(':eq(3)').attr('id')
            $('.workspace-layer-list').sortable("enable")
            $('.context-menu-wrapper').hide()
            $(".workspace-layer-container").addClass('workspace-layer-container-hover')
            $(".workspace-layer-container:not(#" + symbologyLayerCode + ")").show()
            $("#" + symbologyLayerCode).find(".layer-symbology-container").hide()
        };
    };

    updateMapSize = function() {
        var timeout = 150
        setTimeout(function() {map.updateSize();}, timeout);
    };

    toggleFileUploadType = function(evt) {
        $('.local-file-upload').hide()
        $('#' + $(this).val() + '-upload').show()
    };

    updateColorMap = function(evt) {
        layerCode = $(this).parents(':eq(3)').attr('id');
        layerComponent = 'raster';
        mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['colorMap'] = $(this).val();
        mapLayers[layerCode]['layer'][layerComponent]['rasterSource'].changed(); 
        $('#' + layerCode).find('.workspace-layer-icon-container').html(getLegendSVG(layerCode))
    };

    updateLayerSLD = function(evt) {
        layerWorkspace = 'hs_gis'
        layerCode = $(this).parents(':eq(3)').attr('id');
        if ($(evt.target).hasClass('polygon-border-thickness')) {
            layerType = 'polygon'
            layerComponent = 'stroke'
            mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['width'] = $(this).val()
            symbologyData = mapLayers[layerCode]['layer'][layerComponent]['symbologyData']
        };
        if ($(evt.target).hasClass('line-thickness')) {
            layerType = 'line'
            layerComponent = 'stroke'
            mapLayers[layerCode]['layer'][layerComponent]['symbologyData']['width'] = $(this).val()
            symbologyData = mapLayers[layerCode]['layer'][layerComponent]['symbologyData']
        };
        sldString = getSLDString(layerType, layerWorkspace, layerCode, layerComponent, symbologyData);
        mapLayers[layerCode]['layer'][layerComponent]['layerSource'].updateParams({'SLD_BODY': sldString});
        mapLayers[layerCode]['layer'][layerComponent]['imageSource'].getSource().changed()
    };



    /******************************************************
     ****************** LISTENERS *************************
     ******************************************************/

    /* Listener for toggling nav sidebar tabs */
    $(document).on('click', '.tab-nav-button', toggleNavTabs);

    /* Listener for toggling layer visibility */
    $(document).on('click', '.edit-layer-visibility', mapToggleLayerVisibility);

    /* Listener for hiding layer context menu on scroll event */
    $(document).on('mousewheel', hideContextMenu);

    /* Listener for hiding layer context menu on mousedown event */
    $(document).on('mousedown', hideContextMenu);

    /* Listener for toggling layer context menu on click event */
    $(document).on('click', '.context-menu-toggle', toggleContextMenu);

    /* Listener for zooming to a layer's extent */
    $(document).on('click', '.zoom-to-layer', zoomToLayer);

    /* Listener for opening layer symbology menu */
    $(document).on('click', '.edit-layer-symbology', toggleLayerSymbologyMenu);

    /* Listener for closing layer symbology menu */
    $(document).on('click', '.exit-symbology-button', toggleLayerSymbologyMenu);

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

    /* Listener for updating map size on nav toggle */
    $(document).on('click', '.toggle-nav', updateMapSize);

    /* Listener for toggling the file upload type */
    $(document).on('change', '.local-file-select', toggleFileUploadType);

    /* Listener for updating layer colormap */
    $(document).on('change', '.raster-colormap-select', updateColorMap);

    $(document).on('change', '.polygon-border-thickness', updateLayerSLD);

    $(document).on('change', '.line-thickness', updateLayerSLD);

    $(document).on('dblclick', '.workspace-layer-name', changeDisplayName);

    $(document).on('click', '.edit-layer-name', changeDisplayName);

    $(document).on('click', '#upload-file-button', uploadLocalFiles)


    /*****************************************************************************************
     ************************************ INIT FUNCTIONS *************************************
     *****************************************************************************************/

    initLayerList();
    initMap();


}());


