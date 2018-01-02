import logging
from osgeo import osr, gdal, gdalconst

print gdal.__version__


def _find_matched_epsg(proj_str_raw, str_type="esri"):

    epsg_info_list = []

    try:
        source = osr.SpatialReference()
        if str_type.lower() == "esri":
            if type(proj_str_raw) in (str, unicode):
                proj_str_raw = [proj_str_raw]
            source.ImportFromESRI(proj_str_raw)
        elif str_type.lower() == "wkt":
            source.ImportFromWkt(proj_str_raw)

        valid_flag = source.Validate()
        if valid_flag != 0:
            source.Fixup()
        match_list = source.FindMatches()
        for matched_tuple in match_list:

            source_matched = matched_tuple[0]
            confidence = matched_tuple[1]

            if source_matched.IsGeographic():
                epsg = source_matched.GetAuthorityCode("GEOGCS")
            elif source_matched.IsProjected():
                epsg = source_matched.GetAuthorityCode("PROJCS")
            else:
                print("Neither GEOGCS or PROJCS")
                continue
            epsg_info_list.append((int(epsg), confidence, source_matched.ExportToWkt()))
    except Exception as ex:
        print ex.message
    finally:
        return epsg_info_list


def check_crs(res_type, fpath):

    message_erroneous_proj = 'The file "%s" has erroneous or incomplete projection (coordinate reference system) ' \
                             'information. An attempt has still been made to display it, though it is likely ' \
                             'to be spatially incorrect.'
    return_obj = {
        'success': False,
        'message': None,
        'code': None,
        'crsWasChanged': False,
        'new_wkt': None
    }
    prj_wkt_in = None
    prj_type = "esri"
    if res_type.lower() == "rasterresource":
        raster_dataset = gdal.Open(fpath, gdalconst.GA_ReadOnly)
        prj_wkt_in = raster_dataset.GetProjection()
        prj_type = "wkt"

    elif res_type.lower() == "geographicfeatureresource":
        prj_wkt_in = open(fpath, 'r').readlines()
        prj_type = "esri"

    else:
        return_obj["message"] = "Not Supported res_type"
        return return_obj

    matched_list = _find_matched_epsg(prj_wkt_in, str_type=prj_type)
    if len(matched_list) > 0:
        return_obj["success"] = True
        return_obj["code"] = matched_list[0][0]
        return_obj["crsWasChanged"] = True
        return_obj["new_wkt"] = matched_list[0][2]
        print "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx"
        print "{0}".format(fpath)
        print return_obj
    else:
        return_obj["message"] = message_erroneous_proj

    return return_obj
