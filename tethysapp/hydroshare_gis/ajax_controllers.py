from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import shutil
import os
import rasterio
import fiona
import numpy as np
from .utilities import get_user_workspace
from .app import HydroshareGis as app


WORKSPACE = 'hs_gis'
GEOSERVER_URI = 'http://www.example.com/hydroshare-gis'


@csrf_exempt
def ajax_add_layers(request):

    return_obj = {
        "success": 'false',
        "message": None,
        "results": {}
    }

    # -------------------- #
    #   VERIFIES REQUEST   #
    # -------------------- #

    if not (request.is_ajax() and request.method == "POST"):

        return_obj["success"] = 'false'
        return_obj["message"] = "Unable to communicate with server."
        return_obj["results"] = {}

        return JsonResponse(return_obj)

    # ----------------------------- #
    #   GETS DATA FROM JAVASCRIPT   #
    # ----------------------------- #

    if True is True:

        file_list = request.FILES.getlist('files')
        layer_code = str(request.POST.get('layerCode'))
        file_type = str(request.POST.get('fileType'))

        user_workspace = get_user_workspace(request)

        layer_dir = os.path.join(user_workspace, layer_code)
        if not os.path.exists(layer_dir):
            os.makedirs(layer_dir)

        for n, uploaded_file in enumerate(file_list):
            with open(os.path.join(layer_dir, uploaded_file.name), 'w+') as destination:
                for chunk in file_list[n].chunks():
                    destination.write(chunk)

        geoserver_engine = app.get_spatial_dataset_service(name='default_geoserver', as_engine=True)

        response = geoserver_engine.list_workspaces()

        if response['success']:
            workspaces = response['result']

            if WORKSPACE not in workspaces:
                geoserver_engine.create_workspace(workspace_id=WORKSPACE, uri=GEOSERVER_URI)

        store_id = WORKSPACE + ':' + layer_code

        if file_type == "shapefile":

            res_base = os.path.join(layer_dir, ".".join(str(file_list[0]).split(".")[:-1]))

            with fiona.open(res_base + ".shp") as source:
                layer_type = str(source[0]['geometry']['type']).lower()
            
            layer_response = geoserver_engine.create_shapefile_resource(
                store_id=store_id,
                shapefile_base=res_base,
                overwrite=True
            )

            if layer_response['success'] is True:
                return_obj["success"] = 'true'
                return_obj["results"]["workspace"] = WORKSPACE
                return_obj["results"]["layer_code"] = layer_code
                return_obj["results"]["layer_type"] = layer_type 
                return JsonResponse(return_obj)

            else:
                return JsonResponse(return_obj)

        if file_type == "geojson":
            return JsonResponse(return_obj)

        if file_type == "geotiff":

            res_file = os.path.join(layer_dir, str(file_list[0]))

            with rasterio.open(res_file) as src:
                array = src.read()
                raster_ndv = src.meta['nodata']
                if raster_ndv is not None:
                    array = src.read()
                    masked_array = np.ma.masked_equal(array, raster_ndv)
                else:
                    masked_array = array

                raster_max = masked_array[0].max()
                raster_min = masked_array[0].min()

            layer_response = geoserver_engine.create_coverage_resource(
                store_id=store_id,
                coverage_file=res_file,
                coverage_type="geotiff",
                overwrite=True,
            )

            layer_type = "raster"

            if layer_response['success'] is True:
                return_obj["success"] = 'true'
                return_obj["results"]["workspace"] = WORKSPACE
                return_obj["results"]["layer_code"] = layer_code
                return_obj["results"]["layer_type"] = layer_type
                return_obj["results"]["layer_data"] = {}
                return_obj["results"]["layer_data"]["raster_max"] = str(raster_max)
                return_obj["results"]["layer_data"]["raster_min"] = str(raster_min)
                return_obj["results"]["layer_data"]["raster_ndv"] = str(raster_ndv)
                return JsonResponse(return_obj)

            else:
                return JsonResponse(return_obj)

        if file_type == "netcdf":
            return JsonResponse(return_obj)

    else:

        return_obj["success"] = 'false'
        return_obj["message"] = "We encountered a problem while loading your resource data."
        return_obj["results"] = {}

        return JsonResponse(return_obj)
