from django.shortcuts import render
from tethysapp.hydroshare_gis.utilities import *
from hs_restclient import HydroShare, HydroShareAuthBasic
from time import time
from datetime import timedelta


def Test_All_Resources(request):
    try:
        start = time()
        res_count = 0
        num_success = 0
        num_errors = 0
        error_resource_list = []
        ACCEPTABLE_ERRORS_LIST = ['This resource is too large to open in HydroShare GIS',
                                  'There is no projection information associated with this resource',
                                  'Resource contains insufficient geospatial information']
        set_currently_testing(True)

        auth = HydroShareAuthBasic(username='test', password='test')
        hs = HydroShare(auth=auth)

        valid_res_types = ['GeographicFeatureResource', 'RasterResource', 'RefTimeSeriesResource',
                           'GenericResource', 'ScriptResource']
        resource_list = hs.getResourceList(types=valid_res_types)
        num_resources = 0
        for res in hs.getResourceList(types=valid_res_types):
            if res['public']:
                num_resources += 1

        for res in resource_list:
            res_id = None
            try:
                if res['public']:
                    res_count += 1
                    res_id = res['resource_id']
                    print("Currently testing resource %s of %s: %s" % (res_count, num_resources, res_id))
                    if res['resource_type'] == 'GenericResource':
                        response = get_res_files_list(hs, res_id)
                        if response['success']:
                            res_files_list = response['results']['generic_res_files_list']
                            num_files_failed = 0
                            for i, res_file in enumerate(res_files_list):
                                response = process_generic_res_file(hs, res_id, res_file,
                                                                    request.user.username, i)
                                if response['success']:
                                    pass
                                else:
                                    error_acceptable = False
                                    for error in ACCEPTABLE_ERRORS_LIST:
                                        if error in response['message']:
                                            error_acceptable = True
                                            break
                                    if error_acceptable:
                                        pass
                                    else:
                                        num_files_failed += 1
                                        error_resource_list.append('https://www.hydroshare.org/resource/%s on file %s'
                                                                   % (res_id, res_file))
                                        print('ERROR ENCOUNTERED:')
                                        print('RES_ID: %s' % res_id)
                                        print('MESSAGE: %s' % response['message'])
                            if num_files_failed == 0:
                                num_success += 1
                            else:
                                num_errors += 1
                    else:
                        response = process_nongeneric_res(hs, res_id)
                        if response['success']:
                            num_success += 1
                        else:
                            error_acceptable = False
                            for error in ACCEPTABLE_ERRORS_LIST:
                                if error in response['message']:
                                    error_acceptable = True
                                    break
                            if error_acceptable:
                                num_success += 1
                            else:
                                num_errors += 1
                                error_resource_list.append('https://www.hydroshare.org/resource/%s' % res_id)
                                print('ERROR ENCOUNTERED:')
                                print('RES_ID: %s' % res_id)
                                print('MESSAGE: %s' % response['message'])
            except Exception as e:
                num_errors += 1
                error_resource_list.append('https://www.hydroshare.org/resource/%s' % res_id)
                print('ERROR ENCOUNTERED:')
                print('RES_ID: %s' % res_id)
                print('MESSAGE: %s' % str(e))

            print("%d%% complete" % (res_count * 100 / num_resources))

        elapsed = str(timedelta(seconds=time()-start))

        results = '''
        ALL TESTS COMPLETE!

        SUMMARY

            TIME ELAPSED: {0}
            TOTAL RESOURCES TESTED: {1}
            TOTAL FAILED: {2}
            PERCENT FAILED: {3}
            TOTAL SUCCESSFUL: {4}
            PERCENT SUCCESSFUL: {5}

        {6}
        {7}
        '''.format(
            elapsed,
            res_count,
            num_errors,
            '%d%%' % (num_errors * 100 / res_count),
            num_success,
            '%d%%' % (num_success * 100 / res_count),
            'LIST OF FAILED RESOURCES:' if len(error_resource_list) != 0 else 'ALL TESTS PASSED!',
            '\n'.join(error_resource_list)
        )

        print(results)
        email_admin('Test Results', custom_msg=results)
        context = {'results': '<br>'.join(results.split('\n'))}
        set_currently_testing(False)
        return render(request, 'hydroshare_gis/test-results.html', context)
    finally:
        set_currently_testing(False)
