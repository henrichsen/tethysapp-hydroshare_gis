import logging
from osgeo import osr, gdal, gdalconst

logger = logging.getLogger(__name__)


def _find_matched_epsg(proj_str_raw, str_type="esri"):

    epsg_info_list = []
    msg = ""

    try:
        source = osr.SpatialReference()
        # check if GDAL has this function (>=2.3.0)
        func = getattr(source, "FindMatches", None)
        if not func:
            raise Exception("Expected GDAL version: >= 2.3.0; Current: {0}".format(gdal.__version__))
        if str_type.lower() == "esri":
            if type(proj_str_raw) in (str, unicode):
                proj_str_raw = [proj_str_raw]
            source.ImportFromESRI(proj_str_raw)
        elif str_type.lower() == "wkt":
            source.ImportFromWkt(proj_str_raw)
        elif str_type.lower() == "proj4":
            source.ImportFromProj4(proj_str_raw)
        elif str_type.lower() == "epsg":
            source.ImportFromEPSG(proj_str_raw)
        else:
            raise Exception("Unsupported str_type")

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
                logger.debug("Neither GEOGCS or PROJCS")
                continue
            epsg_info_list.append((int(epsg), confidence, source_matched.ExportToWkt()))
    except Exception as ex:
        logger.exception(ex.message)
        msg = ex.message
    finally:
        return epsg_info_list, msg


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

    if res_type.lower() == "rasterresource":
        raster_dataset = gdal.Open(fpath, gdalconst.GA_ReadOnly)
        prj_wkt_in = raster_dataset.GetProjection()

    # elif res_type.lower() == "geographicfeatureresource":
    #     prj_wkt_in = open(fpath, 'r').readlines()

    # else:
    #     return_obj["message"] = "Not Supported res_type: %s"
    #     return return_obj
    else:
        prj_wkt_in = open(fpath, 'r').readlines()
    logger.debug("Trying to match {0}: {1}". format(fpath, prj_wkt_in))

    hit_one = False
    for prj_type in ["esri", "wkt", "proj4"]:
        matched_list, msg = _find_matched_epsg(prj_wkt_in, str_type=prj_type)
        if len(matched_list) > 0:
            return_obj["success"] = True
            return_obj["code"] = matched_list[0][0]
            return_obj["crsWasChanged"] = True
            return_obj["new_wkt"] = matched_list[0][2]
            logger.debug("Found matched: {0}".format(return_obj["code"]))
            logger.debug("Found matched: {0}".format(return_obj["new_wkt"]))
            hit_one = True
            break

    if not hit_one:
        return_obj["message"] = message_erroneous_proj
        logger.debug(message_erroneous_proj)

    return return_obj


if __name__ == "__main__":

    print check_crs("rasterresource", "/home/drew/Downloads/dr_srtm_30_3857.tif")
    print check_crs("rasterresource", "/home/drew/Downloads/logan.tif")
    print _find_matched_epsg(4326, str_type="epsg")