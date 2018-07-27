from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from tethys_sdk.gizmos import *

from .app import HydroshareGis as app


WORKSPACE = 'hs_gis'
GEOSERVER_URI = 'http://www.example.com/hydroshare_gis'


@login_required()
def home(request):
    """
    Controller for the app home page.
    """

    geoserver_engine = app.get_spatial_dataset_service(name='default_geoserver', as_engine=True)
    print "GEOSERVER ENGINE"
    print geoserver_engine
    print "::::::::::::::::"

    geoserver_endpoint = app.get_custom_setting('geoserver');

    context = {
        'geoserver_endpoint': geoserver_endpoint
    }

    return render(request, 'hydroshare_gis/home.html', context)
