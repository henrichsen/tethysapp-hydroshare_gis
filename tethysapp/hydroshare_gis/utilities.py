import os
import shutil
import fiona
import rasterio
import numpy as np
from hs_restclient import HydroShare

from .app import HydroshareGis as app


WORKSPACE = "hs_gis"
GEOSERVER_URI = "http://www.example.com/hydroshare-gis"


def get_user_workspace(request):

    workspace = app.get_user_workspace(request).path

    return workspace


def get_hydroshare_files(layer_directory, hydroshare_id):
    for resource_file in HydroShare().getResourceFileList(str(hydroshare_id)):
        HydroShare().getResourceFile(str(hydroshare_id), resource_file["url"].split("/")[-1], destination=os.path.join(layer_directory, "original"))


def save_files_to_workspace(layer_directory, file_list):
    for n, file in enumerate(file_list):
        with open(os.path.join(layer_directory, "original", file.name), 'w+') as destination:
            for chunk in file_list[n].chunks():
                destination.write(chunk)


def validate_shapefile(layer_directory):
    # Add actual validation process at some point before copying orignal files.
    for file in os.listdir(os.path.join(layer_directory, "original")):
        print file
        print file.split(".")[-1]
        if file.split(".")[-1] in ["shp", "shx", "prj", "dbf"]:
            shutil.copy(os.path.join(layer_directory, "original", file), os.path.join(layer_directory, "data"))


def validate_geotiff(layer_directory):
    # Add actual validation process at some point before copying orignal files.
    for file in os.listdir(os.path.join(layer_directory, "original")):
        print file
        print file.split(".")[-1]
        if file.split(".")[-1] in ["tif"]:
            shutil.copy(os.path.join(layer_directory, "original", file), os.path.join(layer_directory, "data"))


def upload_feature_to_geoserver(layer_directory):

    layer_code = layer_directory.split("/")[-1]
    file_name = ".".join(str(os.listdir(os.path.join(layer_directory, "data"))[0]).split(".")[:-1])
    res_base = os.path.join(layer_directory, "data", file_name)

    with fiona.open(res_base + ".shp") as source:
        layer_type = str(source[0]['geometry']['type']).lower()
        layer_properties = list(source[0]['properties'].keys())

        if layer_type in ['multipolygon']:
            layer_type = 'polygon'
        if layer_type in ['multiline', 'linestring', 'multilinestring']:
            layer_type = 'line'
        if layer_type in ['multipoint']:
            layer_type = 'point'
    
    if not layer_type in ["point", "line", "polygon"]:
        errorLog = "Layer type [" + layer_type + "] does not match point, line, polygon."
        #raise Exception(errorLog)

    geoserver_engine = app.get_spatial_dataset_service(name="default_geoserver", as_engine=True)

    store_id = get_geoserver_store_id(layer_code, geoserver_engine)

    layer_response = geoserver_engine.create_shapefile_resource(
        store_id=store_id,
        shapefile_base=res_base,
        overwrite=True
    )

    layer_results = {}

    if layer_response["success"] is True:
        layer_results["workspace"] = WORKSPACE
        layer_results["layer_code"] = layer_code
        layer_results["layer_type"] = layer_type 
        layer_results["file_name"] = file_name
        layer_results["bounding_box"] = layer_response["result"]["latlon_bbox"]
        layer_results["layer_properties"] = layer_properties

        return layer_results

    else:
        errorLog = layer_response
        raise Exception(errorLog)


def upload_raster_to_geoserver(layer_directory):

    layer_code = layer_directory.split("/")[-1]
    file_name = ".".join(str(os.listdir(os.path.join(layer_directory, "data"))[0]).split(".")[:-1])
    file_path = os.path.join(layer_directory, "data", str(os.listdir(os.path.join(layer_directory, "data"))[0]))

    with rasterio.open(file_path) as src:
        array = src.read()
        raster_ndv = src.meta['nodata']
        if raster_ndv is not None:
            array = src.read()
            masked_array = np.ma.masked_equal(array, raster_ndv)
        else:
            masked_array = array

        raster_max = masked_array[0].max()
        raster_min = masked_array[0].min()

    geoserver_engine = app.get_spatial_dataset_service(name="default_geoserver", as_engine=True)

    store_id = get_geoserver_store_id(layer_code, geoserver_engine)

    layer_response = geoserver_engine.create_coverage_resource(
        store_id=store_id,
        coverage_file=file_path,
        coverage_type="geotiff",
        overwrite=True,
    )

    layer_type = "raster"

    layer_results = {}

    if layer_response["success"] is True:
        layer_results["workspace"] = WORKSPACE
        layer_results["layer_code"] = layer_code
        layer_results["layer_type"] = layer_type 
        layer_results["file_name"] = file_name
        layer_results["bounding_box"] = layer_response["result"]["latlon_bbox"]
        layer_results["raster_max"] = str(raster_max)
        layer_results["raster_min"] = str(raster_min)
        layer_results["raster_ndv"] = str(raster_ndv)

        return layer_results

    else:
        errorLog = layer_response
        raise Exception(errorLog)


def get_geoserver_store_id(layer_code, geoserver_engine):

    response = geoserver_engine.list_workspaces()

    if response["success"]:
        workspaces = response["result"]
        if WORKSPACE not in workspaces:
            geoserver_engine.create_workspace(workspace_id=WORKSPACE, uri=GEOSERVER_URI)

    store_id = WORKSPACE + ':' + layer_code

    return store_id  


def convert_geojson_to_shapefile():
    pass


def convert_netcdf_to_geotiff():
    pass


def create_timeseries_feature():
    pass


def get_resource_list():
    pass


def get_feature_attribute_table():
    pass


def upload_feature_to_hydroshare():
    pass


def upload_raster_to_hydroshare():
    pass


def upload_timeseries_to_hydroshare():
    pass


def create_timeseries_shapefile():
    pass


def get_search_results(search_filters, page_number):
    start = (int(page_number) - 1) * 15
    print search_filters
    if not search_filters["types"]:
        resource_types = ['RasterResource', 'GeographicFeatureResource']
    else:
        resource_types = search_filters["types"]

    full_text_search = str(search_filters["inputText"])
    gen = HydroShare().resources(type=resource_types, full_text_search=full_text_search, start=start, count=16)
    gen_list = list(gen)

    if int(page_number) == 1:
        print 'True'
        first_page = True
    else:
        print 'False'
        first_page = False

    if len(gen_list) < 16:
        last_page = True
    else:
        last_page = False

    search_results = {
        "first_page": first_page,
        "last_page": last_page,
        "page_number": page_number,
        "search_results": gen_list[:-1]
    }

    return search_results


