import hs_restclient as hs_r
from django.http import JsonResponse
from django.conf import settings
from tethys_sdk.services import get_spatial_dataset_engine
from django.core.exceptions import ObjectDoesNotExist

from geoserver.catalog import FailedRequestError
import requests
import zipfile
import os
import sqlite3
import xmltodict
import shutil
from sys import exc_info
from traceback import format_exception
from smtplib import SMTP
from email.mime.text import MIMEText
from socket import gethostname

geoserver_name = 'default'
hs_tempdir = '/tmp/hs_gis_files/'
workspace_id = None


def get_oauth_hs(request):
    hs = None
    hs_hostname = 'www.hydroshare.org'
    try:
        client_id = getattr(settings, 'SOCIAL_AUTH_HYDROSHARE_KEY', 'None')
        client_secret = getattr(settings, 'SOCIAL_AUTH_HYDROSHARE_SECRET', 'None')
        token = request.user.social_auth.get(provider='hydroshare').extra_data['token_dict']
        auth = hs_r.HydroShareAuthOAuth2(client_id, client_secret, token=token)
        hs = hs_r.HydroShare(auth=auth, hostname=hs_hostname)
    except ObjectDoesNotExist:
        if '127.0.0.1' in request.get_host() or 'localhost' in request.get_host():
            auth = hs_r.HydroShareAuthBasic(username='test', password='test')
            hs = hs_r.HydroShare(auth=auth, hostname=hs_hostname)
    return hs


def get_json_response(response_type, message):
    return JsonResponse({response_type: message})


def upload_file_to_geoserver(res_id, res_type, res_file, is_zip, is_mosaic):
    return_obj = {
        'success': False,
        'message': None,
        'results': {
            'layer_name': None,
            'layer_id': None
        }
    }
    global workspace_id
    response = None
    results = return_obj['results']
    engine = return_spatial_dataset_engine()

    if engine is None:
        return_obj['message'] = 'No spatial dataset engine was returned'
    else:
        store_id = 'res_%s' % res_id
        full_store_id = '%s:%s' % (workspace_id, store_id)

        try:
            if res_type == 'RasterResource':
                coverage_type = 'imagemosaic' if is_mosaic else 'geotiff'
                response = engine.create_coverage_resource(store_id=full_store_id,
                                                           coverage_file=res_file,
                                                           coverage_type=coverage_type,
                                                           overwrite=True)

            elif res_type == 'GeographicFeatureResource':
                if is_zip is True:
                    response = engine.create_shapefile_resource(store_id=full_store_id,
                                                                shapefile_zip=res_file,
                                                                overwrite=True)
                elif type(res_file) is not unicode:
                    response = engine.create_shapefile_resource(store_id=full_store_id,
                                                                shapefile_upload=res_file,
                                                                overwrite=True)
                else:
                    response = engine.create_shapefile_resource(store_id=full_store_id,
                                                                shapefile_base=str(res_file),
                                                                overwrite=True)
            if response:
                if not response['success']:
                    try:
                        raise Exception
                    except Exception as e:
                        e.message = response['error']
                        raise e
                else:
                    try:
                        layer_name = response['result']['name']
                    except KeyError:
                        layer_name = engine.list_resources(store=store_id)['result'][0]

                    results['layer_name'] = layer_name
                    results['layer_id'] = '%s:%s' % (workspace_id, layer_name)
                    return_obj['success'] = True
            else:
                return_obj['message'] = 'Failed while uploading resource to Geoserver: Unkown error'
        except AttributeError:
            engine.delete_store(store_id=store_id, purge=True, recurse=True)
            engine.create_workspace(workspace_id=workspace_id, uri='tethys_app-%s' % workspace_id)
            return_obj = upload_file_to_geoserver(res_id, res_type, res_file, is_zip, is_mosaic)

    return return_obj


def make_zipfile(res_files, zip_path):
    return_obj = {
        'success': False,
        'message': None
    }

    if not os.path.exists(zip_path):
        if not os.path.exists(os.path.dirname(zip_path)):
            os.mkdir(os.path.dirname(zip_path))

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, False) as zip_object:
        if type(res_files) is list:
            for f in res_files:
                zip_object.write(f, os.path.basename(f))
        else:
            zip_object.writestr(os.path.basename(res_files), res_files.read())
        zip_object.close()

    return_obj['success'] = True

    return return_obj


def return_spatial_dataset_engine():
    global geoserver_name, workspace_id
    try:
        engine = get_spatial_dataset_engine(name=geoserver_name)
    except Exception as e:
        print str(e)
        engine = None

    return engine


def get_layer_md_from_geoserver(res_id, layer_name, res_type):
    response_obj = {
        'success': False,
        'message': None,
        'attributes': None,
        'extents': None,
        'geom_type': None
    }

    global workspace_id
    geom_type = None
    geoserver_url = get_geoserver_url()

    if res_type == 'GeographicFeatureResource':
        url = '{0}/rest/workspaces/{1}/datastores/res_{2}/featuretypes/{3}.json'.format(geoserver_url,
                                                                                        workspace_id,
                                                                                        res_id,
                                                                                        layer_name)
    else:
        url = '{0}/rest/workspaces/{1}/coveragestores/res_{2}/coverages/{3}.json'.format(geoserver_url,
                                                                                         workspace_id,
                                                                                         res_id,
                                                                                         layer_name)

    r = requests.get(url, auth=get_geoserver_credentials())
    if r.status_code != 200:
        response_obj['message'] = 'The Geoserver appears to be down.'
    else:
        json = r.json()

        if res_type == 'GeographicFeatureResource':
            extents = json['featureType']['latLonBoundingBox']

            attributes = json['featureType']['attributes']['attribute']
            attributes_string = ''
            for attribute in attributes:
                if attribute['name'] == 'the_geom':
                    geom_type = attribute['binding'].split('.')[-1]
                else:
                    attributes_string += attribute['name'] + ','
        else:
            extents = json['coverage']['latLonBoundingBox']
            attributes_string = ','
        response_obj = {
            'success': True,
            'attributes': attributes_string[:-1],
            'extents': extents,
            'geom_type': geom_type
        }

    return response_obj


def get_geoserver_url(request=None):
    engine = get_spatial_dataset_engine(name=geoserver_name)
    geoserver_url = engine.endpoint.split('/rest')[0]

    if request:
        return JsonResponse({'geoserver_url': geoserver_url})
    else:
        return geoserver_url


def extract_site_info_from_time_series(sqlite_file_path):
    site_info = None
    with sqlite3.connect(sqlite_file_path) as con:
        con.row_factory = sqlite3.Row
        cur = con.cursor()
        cur.execute('SELECT * FROM Sites')
        site = cur.fetchone()
        if site:
            if site['Latitude'] and site['Longitude']:
                site_info = {'lon': site['Longitude'], 'lat': site['Latitude'], 'units': 'Decimal degrees'}
                if site['SpatialReferenceID']:
                    cur.execute('SELECT * FROM SpatialReferences WHERE SpatialReferenceID=?',
                                (site['SpatialReferenceID'],))
                    spatialref = cur.fetchone()
                    if spatialref:
                        if spatialref['SRSName']:
                            site_info['projection'] = spatialref['SRSName']

    return site_info


def extract_site_info_from_ref_time_series(hs, res_id):
    site_info = None
    try:
        md_dict = xmltodict.parse(hs.getScienceMetadata(res_id))
        site_info_list = md_dict['rdf:RDF']['rdf:Description'][0]['dc:coverage'][0]['dcterms:point']['rdf:value'].split(';')
        lon = float(site_info_list[0].split('=')[1])
        lat = float(site_info_list[1].split('=')[1])
        projection = site_info_list[2].split('=')[1]
        site_info = {
            'lon': lon,
            'lat': lat,
            'projection': projection
        }
    except KeyError:
        pass

    return site_info


def sizeof_fmt(num, suffix='B'):
    for unit in ['bytes', 'k', 'M', 'G', 'T', 'P', 'E', 'Z']:
        if abs(num) < 1024.0:
            if unit == 'bytes':
                return "%3.1f %s" % (num, unit)
            return "%3.1f %s%s" % (num, unit, suffix)
        num /= 1024.0
    return "%.1f%s%s" % (num, 'Yi', suffix)


def request_wfs_info(params):
    geoserver_url = get_geoserver_url()
    geoserver_url += '/wfs'

    r = requests.get(geoserver_url, params=params, auth=get_geoserver_credentials())

    return r


def get_band_info(hs, res_id, res_type):
    band_info = None
    if res_type == 'RasterResource':
        try:
            md_dict = xmltodict.parse(hs.getScienceMetadata(res_id))
            band_info_raw = md_dict['rdf:RDF']['rdf:Description'][0]['hsterms:BandInformation']['rdf:Description']
            band_info = {
                'min': float(band_info_raw['hsterms:minimumValue']),
                'max': float(band_info_raw['hsterms:maximumValue']),
                'nd': float(band_info_raw['hsterms:noDataValue'])
            }
        except KeyError:
            pass
        except Exception as e:
            print str(e)

    return band_info


def get_geoserver_credentials():
    engine = return_spatial_dataset_engine()
    return (engine.username, engine.password)


# def process_local_file(request):
#     res_type = None
#     res_id = None
#
#     if not os.path.exists(hs_tempdir):
#         os.mkdir(hs_tempdir)
#
#     file_list = request.FILES.getlist('files')
#     file_name = None
#     for f in file_list:
#         file_name = f.name
#         if file_name.endswith('.shp'):
#             # res_id = str(file_name[:-4].__hash__())
#             res_type = 'GeographicFeatureResource'
#             res_filepath_or_obj = file_list
#             break
#         elif file_name.endswith('.tif'):
#             # res_id = str(file_name[:-4].__hash__())
#             res_id = 'temp_id'
#             res_type = 'RasterResource'
#             res_filepath_or_obj = os.path.join(hs_tempdir, res_id, file_name[:-4] + '.zip')
#             make_zipfile(f, file_name, res_filepath_or_obj)
#             break
#         elif file_name.endswith('.zip'):
#             is_zip = True
#             res_id = 'temp_id'
#             res_zip = os.path.join(hs_tempdir, res_id, file_name)
#             if not os.path.exists(res_zip):
#                 if not os.path.exists(os.path.dirname(res_zip)):
#                     os.mkdir(os.path.dirname(res_zip))
#             with zipfile.ZipFile(res_zip, 'w', zipfile.ZIP_DEFLATED, False) as zip_object:
#                 with zipfile.ZipFile(StringIO(f.read())) as z:
#                     for file_name in z.namelist():
#                         zip_object.writestr(file_name, z.read(file_name))
#                         if file_name.endswith('.shp'):
#                             res_id = str(file_name[:-4].__hash__())
#                             res_type = 'GeographicFeatureResource'
#                         elif file_name.endswith('.tif'):
#                             res_id = str(file_name[:-4].__hash__())
#                             res_type = 'RasterResource'
#             os.rename(os.path.join(hs_tempdir, 'temp_id'), os.path.join(hs_tempdir, res_id))
#             res_filepath_or_obj = os.path.join(hs_tempdir, res_id, file_name)
#
#     if res_type is not None:
#         hs = get_oauth_hs(request)
#         if hs is None:
#             return get_json_response('error', 'Please sign in with your HydroShare account to access this feature.')
#         abstract = 'This resource was created while using the HydroShare GIS App.'
#         res_id = hs.createResource(
#             'GenericResource',
#             os.path.splitext(file_name)[0],
#             resource_file=res_filepath_or_obj if res_type == 'RasterResource' else file_list,
#             resource_filename=file_name,
#             abstract=abstract)
#     else:
#         return JsonResponse({
#             'error': 'Zipfile did not contain valid files.'
#         })

def process_hs_res(hs, res_id, res_type=None, res_title=None):
    return_obj = {
        'success': False,
        'message': None,
        'results': {
            'res_id': res_id,
            'res_type': res_type,
            'layer_name': res_title,
            'layer_id': None,
            'layer_extents': None,
            'layer_attributes': None,
            'site_info': None,
            'geom_type': None,
            'band_info': None,
            'project_info': None
        }
    }
    global workspace_id
    results = return_obj['results']

    try:
        if res_type is None or res_title is None:
            md = hs.getSystemMetadata(res_id)
            res_type = md['resource_type']
            res_title = md['resource_title']
            results['layer_name'] = res_title
            results['res_type'] = res_type

        check_res = check_geoserver_for_res(res_id)
        if check_res['isOnGeoserver']:
            layer_name = check_res['layer_name']
            results['layer_id'] = '%s:%s' % (workspace_id, layer_name)
            response = get_layer_md_from_geoserver(res_id=res_id, layer_name=layer_name,
                                                   res_type=res_type)
            if not response['success']:
                return_obj['message'] = response['message']
            else:
                results['layer_attributes'] = response['attributes']
                results['layer_extents'] = response['extents']
                results['geom_type'] = response['geom_type']
                results['band_info'] = get_band_info(hs, res_id, res_type)
                return_obj['success'] = True
        else:
            response = process_res_by_type(hs, res_id, res_type)
            if not response['success']:
                return_obj['message'] = response['message']
            else:
                results['res_type'] = response['res_type']
                results['project_info'] = response['project_info']
                results['layer_id'] = response['layer_id']
                results['band_info'] = response['band_info']
                results['site_info'] = response['site_info']
                results['layer_attributes'] = response['layer_attributes']
                results['layer_extents'] = response['layer_extents']
                results['geom_type'] = response['geom_type']
                return_obj['success'] = True

    except hs_r.HydroShareHTTPException:
        return_obj['message'] = 'The HydroShare server appears to be down.'
    except hs_r.HydroShareNotFound:
        return_obj['message'] = 'This resource was not found on www.hydroshare.org'
    except hs_r.HydroShareNotAuthorized:
        return_obj['message'] = 'You are not authorized to access this resource.'
    except Exception as e:
        return_obj['message'] = 'An unexpected error ocurred. App admin has been notified.'
        if gethostname() != 'ubuntu':
            custom_msg = e.message if e.message else None
            email_traceback(exc_info(), custom_msg)

    if os.path.exists(os.path.join(hs_tempdir, res_id)):
        shutil.rmtree(os.path.join(hs_tempdir, res_id))

    return return_obj


def check_geoserver_for_res(res_id):
    return_obj = {'isOnGeoserver': False}
    engine = None
    store_id = 'res_%s' % res_id
    try:
        engine = return_spatial_dataset_engine()
        response = engine.list_resources(store=store_id)
        if response['success']:
            results = response['result']
            assert len(results) == 1
            layer_name = response['result'][0]
            return_obj = {
                'isOnGeoserver': True,
                'layer_name': layer_name,
            }
    except AssertionError:
        if engine is not None:
            engine.delete_store(store_id=store_id, purge=True, recurse=True)
    except FailedRequestError:
        pass
    except Exception as e:
        print e
        if gethostname() != 'ubuntu':
            email_traceback(exc_info())

    return return_obj


def download_res_from_hs(hs, res_id):
    return_obj = {
        'success': False,
        'res_contents_path': None
    }
    if not os.path.exists(hs_tempdir):
        os.mkdir(hs_tempdir)
    hs.getResource(res_id, destination=hs_tempdir, unzip=True)
    res_contents_path = os.path.join(hs_tempdir, res_id, res_id, 'data', 'contents')

    return_obj['res_contents_path'] = res_contents_path
    return_obj['success'] = True

    return return_obj


def process_res_by_type(hs, res_id, res_type):
    return_obj = {
        'success': False,
        'message': None,
        'res_type': None,
        'project_info': None,
        'layer_id': None,
        'band_info': None,
        'site_info': None,
        'layer_attributes': None,
        'layer_extents': None,
        'geom_type': None,
    }

    if res_type == 'RefTimeSeriesResource':
        site_info = extract_site_info_from_ref_time_series(hs, res_id)
        if not site_info:
            return_obj['message'] = 'Required site info data not available.'
        else:
            return_obj['site_info'] = site_info
            return_obj['success'] = True
    else:
        response = download_res_from_hs(hs, res_id)
        if not response['success']:
            return_obj['message'] = response['message']
        else:
            res_contents_path = response['res_contents_path']
            response = get_info_from_res_files(res_id, res_contents_path)
            if not response['success']:
                return_obj['message'] = response['message']
            else:
                res_filepath = response['res_filepath']
                is_mosaic = response['is_mosaic']
                is_zip = response['is_zip']
                res_type = response['res_type']
                return_obj['res_type'] = res_type

                if res_type == 'GenericResource':
                    if res_filepath and res_filepath.endswith('mapProject.json'):
                        with open(res_filepath) as project_file:
                            project_info = project_file.read()

                        return_obj['project_info'] = project_info
                        return_obj['success'] = True
                    else:
                        return_obj['message'] = 'This resource does not contain any content ' \
                                                'that HydroShare GIS can display.'
                elif res_type == 'GeographicFeatureResource' or res_type == 'RasterResource':
                    check_res = upload_file_to_geoserver(res_id, res_type, res_filepath, is_zip, is_mosaic)
                    if not check_res['success']:
                        return_obj['message'] = check_res['message']
                    else:
                        results = check_res['results']
                        layer_name = results['layer_name']
                        return_obj['layer_id'] = results['layer_id']

                        response = get_layer_md_from_geoserver(res_id=res_id, layer_name=layer_name,
                                                               res_type=res_type)
                        if not response['success']:
                            return_obj['message'] = response['message']
                        else:
                            return_obj['layer_attributes'] = response['attributes']
                            return_obj['layer_extents'] = response['extents']
                            return_obj['geom_type'] = response['geom_type']
                            return_obj['band_info'] = get_band_info(hs, res_id, res_type)
                            return_obj['success'] = True
                else:
                    return_obj['message'] = 'Resource cannot be opened with HydroShare GIS: Invalid resource type.'

    return return_obj

def get_info_from_res_files(res_id, res_contents_path):
    return_obj = {
        'success': False,
        'res_filepath': None,
        'res_type': None,
        'is_mosaic': False,
        'is_zip': False
    }
    res_filepath = None
    res_type = None

    if os.path.exists(res_contents_path):
        for f in os.listdir(res_contents_path):
            src = os.path.join(res_contents_path, f)
            dst = os.path.join(res_contents_path, 'res_' + res_id + os.path.splitext(f)[1])
            os.rename(src, dst)
        coverage_files = []
        tif_count = 0
        for file_name in os.listdir(res_contents_path):
            if file_name.endswith('.shp'):
                res_filepath = os.path.join(res_contents_path, file_name[:-4])
                res_type = 'GeographicFeatureResource'
                break

            if file_name == 'mapProject.json':
                res_filepath = os.path.join(res_contents_path, file_name)
                res_type = 'GenericResource'
                break

            if file_name.endswith('.vrt') or file_name.endswith('.tif'):
                if file_name.endswith('.tif'):
                    tif_count += 1
                if tif_count > 1:
                    return_obj['is_mosaic'] = True
                coverage_files.append(os.path.join(res_contents_path, file_name))
                res_type = 'RasterResource'

        if coverage_files:
            res_filepath = os.path.join(res_contents_path, res_id + '.zip')
            response = make_zipfile(coverage_files, res_filepath)
            if not response['success']:
                return_obj['message'] = response['message']
            else:
                return_obj['is_zip'] = True

        return_obj['res_filepath'] = res_filepath
        return_obj['res_type'] = res_type
        return_obj['success'] = True

    return return_obj


def get_hs_res_list(hs):
    # Deletes all stores from geoserver
    # engine = return_spatial_dataset_engine()
    # stores = engine.list_stores(workspace_id)
    # for store in stores['result']:
    #     engine.delete_store(store_id=store_id, purge=True, recurse=True)
    #     print "Store %s deleted" % store
    return_obj = {
        'success': False,
        'message': None,
        'res_list': None
    }
    res_list = []

    try:
        valid_res_types = ['GeographicFeatureResource', 'RasterResource', 'RefTimeSeriesResource', 'TimeSeriesResource']
        for res in hs.getResourceList(types=valid_res_types):
            res_id = res['resource_id']
            res_size = 0
            try:
                for res_file in hs.getResourceFileList(res_id):
                    res_size += res_file['size']

            except hs_r.HydroShareNotAuthorized:
                continue
            except Exception as e:
                print str(e)

            res_list.append({
                'title': res['resource_title'],
                'type': res['resource_type'],
                'id': res_id,
                'size': sizeof_fmt(res_size) if res_size != 0 else "N/A",
                'owner': res['creator']
            })

        return_obj['res_list'] = res_list
        return_obj['success'] = True

    except hs_r.HydroShareHTTPException:
        return_obj['message'] = 'The HydroShare server appears to be down.'
    except Exception as e:
        print e
        return_obj['message'] = 'An unexpected error ocurred. App admin has been notified.'
        if gethostname() != 'ubuntu':
            email_traceback(exc_info())

    return return_obj


def set_workspace_id(request):
    global workspace_id
    if 'apps.hydroshare' in request.get_host():
        workspace_id = 'hydroshare_gis'
    else:
        workspace_id = 'hydroshare_gis_testing'


def email_traceback(traceback, custom_msg=None):
    exc_type, exc_value, exc_traceback = traceback
    email = 'scrawley@byu.edu'
    trcbck = ''.join(format_exception(exc_type, exc_value, exc_traceback))
    msg_raw = trcbck + custom_msg if custom_msg else trcbck
    msg = MIMEText(msg_raw)
    msg['Subject'] = 'HydroShare GIS ERROR'
    msg['From'] = email
    msg['To'] = email

    s = None
    try:
        s = SMTP(gethostname())
        s.sendmail(email, [email], msg.as_string())
    except Exception as e:
        print str(e)
    if s:
        s.quit()
