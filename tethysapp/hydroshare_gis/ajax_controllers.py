from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import os
import rasterio
import numpy as np

from .utilities import get_user_workspace, upload_feature_to_geoserver, \
    convert_geojson_to_shapefile, upload_raster_to_geoserver, convert_netcdf_to_geotiff, \
    save_files_to_workspace, create_timeseries_shapefile, validate_shapefile, \
    validate_geotiff, get_hydroshare_files, get_search_results

from .app import HydroshareGis as app


def ajax_add_local_layer(request):

    return_obj = {
        "success": None,
        "message": None,
        "results": None
    }

    # -------------------- #
    #   VERIFIES REQUEST   #
    # -------------------- #

    if not (request.is_ajax() and request.method == "POST"):

        return_obj["success"] = "false"
        return_obj["message"] = "Unable to communicate with server."
        return_obj["results"] = {}

        return JsonResponse(return_obj)

    # ----------------------------- #
    #   GETS DATA FROM JAVASCRIPT   #
    # ----------------------------- #

    layer_source = str(request.POST.get('layerSource'))
    layer_code = str(request.POST.get('layerCode'))
    file_type = str(request.POST.get('fileType'))

    # --------------------------- #
    #   PROCESSES UPLOADED DATA   #
    # --------------------------- #

    user_workspace = get_user_workspace(request)

    layer_directory = os.path.join(user_workspace, layer_code)
    if not os.path.exists(layer_directory):
        os.makedirs(os.path.join(layer_directory, "original"))
        os.makedirs(os.path.join(layer_directory, "data"))

    if layer_source == "client":
        file_list = request.FILES.getlist('files')
        save_files_to_workspace(layer_directory, file_list)

    elif layer_source == "hydroshare":
        hydroshare_id = str(request.POST.get('hydroshareId'))
        get_hydroshare_files(layer_directory, hydroshare_id)

    else:
        errorLog = "Unable to process layer source: " + layer_source
        raise Exception(errorLog)       

    if file_type == "shapefile":
        validate_shapefile(layer_directory)
        layer_results = upload_feature_to_geoserver(layer_directory)

    elif file_type == "geojson":
        convert_geojson_to_shapefile(layer_directory)
        layer_results = upload_feature_to_geoserver(layer_directory)

    elif file_type == "geotiff":
        validate_geotiff(layer_directory)
        layer_results = upload_raster_to_geoserver(layer_directory)

    elif file_type == "netcdf":
        convert_netcdf_to_geotiff(layer_directory)
        layer_results = upload_raster_to_geoserver(layer_directory)

    elif file_type == "odm2":
        create_timeseries_shapefile(layer_directory)
        layer_results = upload_feature_to_geoserver(layer_directory)

    elif file_type == "refts":
        create_timeseries_shapefile(layer_directory)
        layer_results = upload_feature_to_geoserver(layer_directory)

    else:
        errorLog = "Unable to process file type: " + file_type
        raise Exception(errorLog)

    # -------------------------- #
    #   RETURNS DATA TO CLIENT   #
    # -------------------------- #

    return_obj["success"] = "true"
    return_obj["message"] = "Layer successful uploaded to GeoServer"
    return_obj["results"] = layer_results

    return JsonResponse(return_obj)


def ajax_search_hydroshare(request):

    return_obj = {
        "success": None,
        "message": None,
        "results": None
    }

    # -------------------- #
    #   VERIFIES REQUEST   #
    # -------------------- #

    if not (request.is_ajax() and request.method == "POST"):

        return_obj["success"] = "false"
        return_obj["message"] = "Unable to communicate with server."
        return_obj["results"] = {}

        return JsonResponse(return_obj)

    # ----------------------------- #
    #   GETS DATA FROM JAVASCRIPT   #
    # ----------------------------- #

    search_input = request.POST.get('searchInput')
    page = request.POST.get('page')

    # ----------------------- #
    #   GETS SEARCH RESULTS   #
    # ----------------------- #

    search_results = get_search_results(search_input, page)

    # -------------------------- #
    #   RETURNS DATA TO CLIENT   #
    # -------------------------- #

    return_obj["success"] = "true"
    return_obj["message"] = "Search results obtained"
    return_obj["results"] = search_results

    return JsonResponse(return_obj)


def ajax_get_attribute_table(request):

    return_obj = {
        "success": "",
        "message": None,
        "results": {}
    }

    # -------------------- #
    #   VERIFIES REQUEST   #
    # -------------------- #

    if not (request.is_ajax() and request.method == "POST"):

        return_obj["success"] = "false"
        return_obj["message"] = "Unable to communicate with server."
        return_obj["results"] = {}

        return JsonResponse(return_obj)

    # ----------------------------- #
    #   GETS DATA FROM JAVASCRIPT   #
    # ----------------------------- #

    layer_code = str(request.POST.get('layerCode'))

    user_workspace = get_user_workspace(request)





















