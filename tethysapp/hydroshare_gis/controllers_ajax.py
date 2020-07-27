from django.http import JsonResponse, Http404, HttpResponse

from .utilities import process_nongeneric_res, get_hs_res_list, get_geoserver_url, \
    process_local_file, save_new_project, save_project, generate_attribute_table, delete_tempfiles, \
    get_features_on_click, get_res_files_list, get_res_layers_from_db, process_generic_res_file, \
    get_file_mime_type, validate_res_request, get_generic_file_layer_from_db, get_hs_auth_obj



message_need_to_login = ('You must be signed in with your HydroShare account. '
                        'If you thought you had already done so, your login likely timed out. '
                        'In that case, please log in again')
message_template_wrong_req_method = 'This request can only be made through a "{method}" AJAX call.'
message_template_param_unfilled = 'The required "{param}" parameter was not fulfilled.'
message_multiple_logins = 'It looks like someone is already logged in to this app with your HydroShare account.'


def ajax_add_hs_res(request):
    return_obj = {
        'success': False,
        'message': None,
        'results': {}
    }
    if request.is_ajax() and request.method == 'GET':
        if not request.GET.get('res_id'):
            return_obj['message'] = message_template_param_unfilled.format(param='res_id')
        else:
            res_id = request.GET['res_id']
            res_type = None
            res_title = None
            if request.GET.get('res_type'):
                res_type = request.GET['res_type']
            if request.GET.get('res_title'):
                res_title = request.GET['res_title']

            r = get_hs_auth_obj(request)
            if not r['success']:
                return_obj['message'] = r['message']
                return return_obj
            else:
                hs = r['hs_obj']
                r = validate_res_request(hs, res_id)
                if not r['can_access']:
                    return_obj['message'] = r['message']
                else:
                    res_layers_obj_list = get_res_layers_from_db(hs, res_id, res_type, res_title, request.user.username)
                    if res_layers_obj_list:
                        return_obj['results'] = res_layers_obj_list
                        return_obj['success'] = True
                    else:
                        return_obj = process_nongeneric_res(hs, res_id, res_type, res_title, request.user.username)

    else:
        return_obj['message'] = message_template_wrong_req_method.format(method="GET")

    return JsonResponse(return_obj)


def ajax_add_local_file(request):
    return_obj = {
        'success': False,
        'message': None,
        'results': {}
    }
    if request.is_ajax() and request.method == 'POST':
        params = request.POST
        file_list = request.FILES.getlist('files')
        proj_id = params['proj_id']
        res_type = params['res_type'] if params.get('res_type') else None
        res_title = params['res_title'] if params.get('res_title') else None
        res_abstract = params['res_abstract'] if params.get('res_abstract') else None
        res_keywords = params['res_keywords'] if params.get('res_keywords') else None
        flag_create_resources = params['flag_create_resources'] == 'true'

        r = get_hs_auth_obj(request)
        if not r['success']:
            return_obj['message'] = r['message']
            return return_obj
        else:
            hs = r['hs_obj']
            return_obj = process_local_file(file_list=file_list, proj_id=proj_id, hs=hs, res_type=res_type,
                                            username=request.user.username, flag_create_resources=flag_create_resources,
                                            res_title=res_title, res_abstract=res_abstract,
                                            res_keywords=res_keywords)
    else:
        return_obj['message'] = message_template_wrong_req_method.format(method="POST")

    return JsonResponse(return_obj)


def ajax_get_hs_res_list(request):
    return_obj = {
        'success': False,
        'message': None,
        'res_list': None
    }

    if request.is_ajax() and request.method == 'GET':
        r = get_hs_auth_obj(request)
        if not r['success']:
            return_obj['message'] = r['message']
            return return_obj
        else:
            hs = r['hs_obj']
            response = get_hs_res_list(hs)
            if not response['success']:
                return_obj['message'] = response['message']
            else:
                return_obj['res_list'] = response['res_list']
                return_obj['success'] = True
    else:
        return_obj['error'] = message_template_wrong_req_method.format(method="GET")

    return JsonResponse(return_obj)


def ajax_generate_attribute_table(request):
    if request.is_ajax() and request.method == 'GET':
        layer_id = request.GET['layerId']
        layer_attributes = request.GET['layerAttributes']

        return_obj = generate_attribute_table(layer_id, layer_attributes)
        return JsonResponse(return_obj)


def ajax_save_new_project(request):
    return_obj = {
        'success': False,
        'message': None,
        'res_id': None
    }
    if request.is_ajax() and request.method == 'POST':
        params = request.POST
        project_info = str(params['projectInfo'])
        res_title = str(params['resTitle'])
        res_abstract = str(params['resAbstract'])
        res_keywords_raw = str(params['resKeywords'])
        res_keywords = str(res_keywords_raw).split(',')

        r = get_hs_auth_obj(request)
        if not r['success']:
            return_obj['message'] = r['message']
            return return_obj
        else:
            hs = r['hs_obj']
            return_obj = save_new_project(hs=hs, project_info=project_info, res_title=res_title,
                                          res_abstract=res_abstract, res_keywords=res_keywords,
                                          username=request.user.username)

        return JsonResponse(return_obj)


def ajax_save_project(request):
    return_obj = {}

    if request.is_ajax() and request.method == 'POST':
        post_data = request.POST
        res_id = post_data['res_id']
        project_info = post_data['project_info']

        r = get_hs_auth_obj(request)
        if not r['success']:
            return_obj['message'] = r['message']
            return return_obj
        else:
            hs = r['hs_obj']
            return_obj = save_project(hs, res_id, project_info)

        return JsonResponse(return_obj)


def ajax_get_geoserver_url(request):
    return get_geoserver_url(request)


def ajax_delete_tempfiles(request):
    if request.is_ajax and request.method == 'GET':
        delete_tempfiles(username=request.user.username)

    return JsonResponse({'success': True})


def ajax_get_features_on_click(request):
    if request.is_ajax and request.method == 'GET':
        params_str = request.GET['params']
        return_obj = get_features_on_click(params_str)

        return JsonResponse(return_obj)


def ajax_get_generic_res_files_list(request):
    return_obj = {
        'success': False,
        'message': None,
        'results': {}
    }
    if request.is_ajax() and request.method == 'GET':
        if not request.GET.get('res_id'):
            return_obj['message'] = message_template_param_unfilled.format(param='res_id')
        else:
            res_id = request.GET['res_id']
            r = get_hs_auth_obj(request)
            if not r['success']:
                return_obj['message'] = r['message']
                return return_obj
            else:
                hs = r['hs_obj']
                return_obj = get_res_files_list(hs=hs, res_id=res_id)
    else:
        return_obj['message'] = message_template_wrong_req_method.format(method="GET")

    return JsonResponse(return_obj)


def ajax_add_generic_res_file(request):
    return_obj = {
        'success': False,
        'message': None,
        'results': {}
    }
    if request.is_ajax() and request.method == 'GET':
        if not request.GET.get('res_id'):
            return_obj['message'] = message_template_param_unfilled.format(param='res_id')
        else:
            res_id = request.GET['res_id']
            if not request.GET.get('res_fname'):
                return_obj['message'] = message_template_param_unfilled.format(param='res_fname')
            else:
                res_fname = request.GET['res_fname']
                file_index = int(request.GET['file_index'])

                r = get_hs_auth_obj(request)
                if not r['success']:
                    return_obj['message'] = r['message']
                    return return_obj
                else:
                    hs = r['hs_obj']
                    r = validate_res_request(hs, res_id)
                    if not r['can_access']:
                        return_obj['message'] = r['message']
                    else:
                        generic_file_layer_obj = get_generic_file_layer_from_db(hs, res_id, res_fname, file_index,
                                                                                request.user.username)
                        if generic_file_layer_obj:
                            return_obj['results'] = generic_file_layer_obj
                            return_obj['success'] = True
                        else:
                            return_obj = process_generic_res_file(hs, res_id, res_fname, request.user.username,
                                                                  file_index)
    else:
        return_obj['message'] = message_template_wrong_req_method.format(method="GET")

    return JsonResponse(return_obj)


def ajax_proxy_get_file(request):
    r = get_hs_auth_obj(request)
    if r['success']:
        hs = r['hs_obj']
        res_id = request.GET['res_id']
        fname = request.GET['fname']
        content_type = get_file_mime_type(fname)
        response = HttpResponse(content_type=content_type)
        for chunk in hs.getResourceFile(res_id, fname):
            response.write(chunk)
        return response
    return Http404()
